// Claudesy — Clinical Trajectory API Route
/**
 * GET /api/patients/[id]/trajectory
 *
 * Exposes the Clinical Momentum Engine (CME) trajectory analysis for a patient
 * to the frontend. Runs analyzeTrajectory() against DB-persisted vital history
 * and returns a full TrajectoryAnalysis.
 *
 * Path params:
 *   [id] — Privacy-safe patient identifier (64-char hex SHA-256 hash).
 *           Use buildPatientIdentifierHash() to derive from MRN.
 *
 * Query params:
 *   visits — Number of visits to analyze (default: 5, max: 10)
 *
 * Authentication: HMAC crew cookie (any authenticated staff).
 * PHI guard: patient identifier is a hash — no plaintext PHI in logs or response.
 *
 * Clinical Momentum Engine — UI Intelligence Layer
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { analyzeTrajectory } from '@/lib/clinical/trajectory-analyzer'
import type { VisitRecord } from '@/lib/clinical/trajectory-analyzer'
import { getPatientVitalHistory } from '@/lib/vitals/vital-record-service'
import type { VitalHistoryEntry } from '@/lib/vitals/vital-record-service'
import { PatientIdentifierSchema, TrajectoryQuerySchema } from '@/types/abyss/trajectory'
import type { VitalSnapshot, MomentumSnapshot } from '@/types/abyss/trajectory'
import { computeMomentum } from '@/lib/clinical/momentum-engine'
import type { AVPULevel } from '@/lib/vitals/unified-vitals'

export const runtime = 'nodejs'

// ── Mapper: VitalHistoryEntry → VisitRecord ───────────────────────────────────

function toVisitRecord(entry: VitalHistoryEntry): VisitRecord {
  return {
    id: undefined,
    patient_id: entry.patientIdentifier,
    encounter_id: entry.encounterId ?? '',
    timestamp: entry.recordedAt instanceof Date
      ? entry.recordedAt.toISOString()
      : String(entry.recordedAt),
    vitals: {
      sbp: entry.vitals.sbp ?? 0,
      dbp: entry.vitals.dbp ?? 0,
      hr: entry.vitals.hr ?? 0,
      rr: entry.vitals.rr ?? 0,
      temp: entry.vitals.temp ?? 0,
      glucose:
        typeof entry.vitals.glucose === 'number'
          ? entry.vitals.glucose
          : entry.vitals.glucose?.value ?? 0,
      spo2: entry.vitals.spo2 ?? 0,
      avpu: (entry.avpu as AVPULevel | null) ?? undefined,
    },
    keluhan_utama: '',
    diagnosa: undefined,
    source: 'uplink',
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // 1. Auth
  if (!isCrewAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate patient identifier
  const { id } = await params
  const identifierResult = PatientIdentifierSchema.safeParse(id)
  if (!identifierResult.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid patient identifier format' },
      { status: 400 }
    )
  }
  const patientIdentifier = identifierResult.data

  // 3. Validate query params
  const rawVisits = req.nextUrl.searchParams.get('visits')
  const queryResult = TrajectoryQuerySchema.safeParse({ visits: rawVisits ?? undefined })
  const visitCount = queryResult.success ? queryResult.data.visits : 5

  // 4. Fetch vital history
  const historyResult = await getPatientVitalHistory(patientIdentifier, visitCount)
  if (!historyResult.success) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve vital history' },
      { status: 500 }
    )
  }

  const entries = historyResult.data
  if (entries.length < 1) {
    return NextResponse.json(
      { success: false, error: 'Insufficient visit data for trajectory analysis' },
      { status: 422 }
    )
  }

  // 5. Convert to VisitRecord[] and run trajectory analysis
  const visitRecords: VisitRecord[] = entries.map(toVisitRecord)

  let analysis
  try {
    analysis = analyzeTrajectory(visitRecords)
  } catch (err) {
    // Log internally — never expose clinical computation errors to client
    console.error('[trajectory] analyzeTrajectory failed for patient hash:', patientIdentifier.slice(0, 8), err)
    return NextResponse.json(
      { success: false, error: 'Trajectory analysis unavailable' },
      { status: 500 }
    )
  }

  // 6. Build visit_history — PHI-safe vital snapshots per visit
  const visit_history: VitalSnapshot[] = entries.map((e) => ({
    visitDate: e.recordedAt instanceof Date ? e.recordedAt.toISOString() : String(e.recordedAt),
    sbp: e.vitals.sbp ?? null,
    dbp: e.vitals.dbp ?? null,
    hr: e.vitals.hr ?? null,
    rr: e.vitals.rr ?? null,
    temp: e.vitals.temp ?? null,
    glucose: typeof e.vitals.glucose === 'number'
      ? e.vitals.glucose
      : (e.vitals.glucose?.value ?? null),
    spo2: e.vitals.spo2 ?? null,
  }))

  // 7. Build momentum_history — retroactive momentum score per visit subset
  const momentum_history: MomentumSnapshot[] = visitRecords.length >= 3
    ? visitRecords.map((_, i) => {
        if (i < 1) return null
        const subset = visitRecords.slice(0, i + 1)
        const m = computeMomentum(subset)
        return {
          visitDate: visitRecords[i].timestamp,
          score: m.score,
          level: m.level,
        } satisfies MomentumSnapshot
      }).filter((s): s is MomentumSnapshot => s !== null)
    : []

  // 8. Return
  return NextResponse.json({
    success: true,
    data: analysis,
    visit_history,
    momentum_history,
    meta: {
      patientIdentifier: patientIdentifier.slice(0, 8) + '…', // truncated for logs
      visitCount: entries.length,
      analyzedAt: new Date().toISOString(),
    },
  })
}
