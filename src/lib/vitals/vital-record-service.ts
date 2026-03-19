/**
 * Vital Record Service
 *
 * Persists and retrieves vital sign records from the database.
 * Every vital sign captured via Assist triage is stored here,
 * enabling longitudinal trajectory analysis.
 *
 * PHI/PII guard: patient names and DOB are NEVER stored in plaintext.
 * Use `buildPatientIdentifierHash()` to derive a stable, privacy-safe key.
 *
 * Clinical Momentum Engine — Phase 1B (Data Foundation)
 */

import 'server-only'

import type { Result } from '@abyss/types'
import type { VitalRecord, VitalRecordSource } from '@prisma/client'
import type { NEWS2RiskLevel } from '@/lib/cdss/news2'
import { prisma } from '@/lib/prisma'
import type { TriageVitalSigns } from './unified-vitals'

export {
  buildPatientIdentifierFromRM,
  buildPatientIdentifierHash,
} from './vital-record-utils'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PersistVitalRecordInput {
  /** Privacy-safe patient identifier — use buildPatientIdentifierHash() */
  patientIdentifier: string
  encounterId?: string
  vitals: TriageVitalSigns
  news2Score: number
  news2Risk: NEWS2RiskLevel
  /** Serialized red flags from checkVitalRedFlags */
  flags?: RedFlagSummary[]
  source?: VitalRecordSource
  /** ISO timestamp of when the vital was measured (not when it was saved) */
  recordedAt: string
  recordedByUserId?: string
}

export interface RedFlagSummary {
  severity: 'emergency' | 'urgent' | 'warning'
  condition: string
}

export interface VitalHistoryEntry {
  id: string
  patientIdentifier: string
  encounterId: string | null
  vitals: TriageVitalSigns
  news2Score: number
  news2Risk: string
  avpu: string | null
  flags: RedFlagSummary[]
  source: string
  recordedAt: Date
  recordedByUserId: string | null
}

// Patient identifier hash utilities are exported from vital-record-utils.ts
// Re-exported above for convenience via: export { buildPatientIdentifierHash, ... }

// ── Map NEWS2Risk ────────────────────────────────────────────────────────────

function toVitalRecordRisk(level: NEWS2RiskLevel) {
  switch (level) {
    case 'low':
      return 'LOW' as const
    case 'low_medium':
      return 'LOW_MEDIUM' as const
    case 'medium':
      return 'MEDIUM' as const
    case 'high':
      return 'HIGH' as const
  }
}

// ── Persist ──────────────────────────────────────────────────────────────────

/**
 * Persist a vital sign record to the database.
 *
 * Non-blocking by design — caller should NOT await this on the hot path.
 * DB failures are captured in Result and logged; triage relay is not blocked.
 *
 * Deduplication: if a record with the same patientIdentifier exists within
 * 60 seconds with identical sbp+hr, it is considered a duplicate and the
 * existing record is returned without inserting.
 */
export async function persistVitalRecord(
  input: PersistVitalRecordInput
): Promise<Result<VitalHistoryEntry>> {
  try {
    const recordedAtDate = new Date(input.recordedAt)

    // Deduplication window: 60 seconds, same patient + same key vitals
    const dedupeWindowStart = new Date(recordedAtDate.getTime() - 60_000)
    const existing = await prisma.vitalRecord.findFirst({
      where: {
        patientIdentifier: input.patientIdentifier,
        recordedAt: { gte: dedupeWindowStart, lte: new Date(recordedAtDate.getTime() + 60_000) },
      },
      orderBy: { recordedAt: 'desc' },
    })

    if (existing) {
      const existingVitals = existing.vitals as Record<string, unknown>
      if (existingVitals.sbp === input.vitals.sbp && existingVitals.hr === input.vitals.hr) {
        return { success: true, data: toHistoryEntry(existing) }
      }
    }

    const record = await prisma.vitalRecord.create({
      data: {
        patientIdentifier: input.patientIdentifier,
        encounterId: input.encounterId ?? null,
        vitals: input.vitals as object,
        news2Score: input.news2Score,
        news2Risk: toVitalRecordRisk(input.news2Risk),
        avpu: input.vitals.avpu ?? null,
        flags: (input.flags ?? []) as object[],
        source: input.source ?? 'ASSIST_TRIAGE',
        recordedAt: recordedAtDate,
        recordedByUserId: input.recordedByUserId ?? null,
      },
    })

    return { success: true, data: toHistoryEntry(record) }
  } catch (err) {
    return {
      success: false,
      error: new Error(
        `VitalRecord persist failed: ${err instanceof Error ? err.message : String(err)}`
      ),
    }
  }
}

// ── Retrieve ─────────────────────────────────────────────────────────────────

/**
 * Retrieve vital history for a patient, ordered oldest→newest.
 *
 * @param patientIdentifier - Hashed patient ID from buildPatientIdentifierHash()
 * @param limit - Max records to return (default 10, used for trajectory window)
 */
export async function getPatientVitalHistory(
  patientIdentifier: string,
  limit = 10
): Promise<Result<VitalHistoryEntry[]>> {
  try {
    const records = await prisma.vitalRecord.findMany({
      where: { patientIdentifier },
      orderBy: { recordedAt: 'asc' },
      take: limit,
    })

    return { success: true, data: records.map(toHistoryEntry) }
  } catch (err) {
    return {
      success: false,
      error: new Error(
        `VitalRecord retrieve failed: ${err instanceof Error ? err.message : String(err)}`
      ),
    }
  }
}

/**
 * Retrieve vital records by date range (for population analysis).
 */
export async function getVitalRecordsByDateRange(
  from: Date,
  to: Date,
  limit = 500
): Promise<Result<VitalHistoryEntry[]>> {
  try {
    const records = await prisma.vitalRecord.findMany({
      where: {
        recordedAt: { gte: from, lte: to },
      },
      orderBy: { recordedAt: 'asc' },
      take: limit,
    })

    return { success: true, data: records.map(toHistoryEntry) }
  } catch (err) {
    return {
      success: false,
      error: new Error(
        `VitalRecord date-range retrieve failed: ${err instanceof Error ? err.message : String(err)}`
      ),
    }
  }
}

// ── Converter ────────────────────────────────────────────────────────────────

function toHistoryEntry(record: VitalRecord): VitalHistoryEntry {
  return {
    id: record.id,
    patientIdentifier: record.patientIdentifier,
    encounterId: record.encounterId,
    vitals: record.vitals as TriageVitalSigns,
    news2Score: record.news2Score,
    news2Risk: record.news2Risk,
    avpu: record.avpu,
    flags: (record.flags as unknown as RedFlagSummary[]) ?? [],
    source: record.source,
    recordedAt: record.recordedAt,
    recordedByUserId: record.recordedByUserId,
  }
}
