// POST /api/consult/accept — dokter "Ambil kasus", persist untuk audit / bridge EMR nanti.
import { type NextRequest, NextResponse } from 'next/server'

import {
  appendClinicalCaseAuditEvent,
  CLINICAL_CASE_AUDIT_EVENTS,
} from '@/lib/audit/clinical-case-audit'
import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { appendAcceptedConsult } from '@/lib/telemedicine/consult-accepted'
import { validateAcceptBody } from '@/lib/telemedicine/consult-api-validation'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = getCrewSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = validateAcceptBody(body)
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: validation.status }
      )
    }
    const { consultId, consult } = validation.data
    const acceptedAt = new Date().toISOString()

    appendAcceptedConsult({
      consultId,
      acceptedBy: session.displayName,
      acceptedAt,
      consult,
    })

    await appendClinicalCaseAuditEvent({
      eventType: CLINICAL_CASE_AUDIT_EVENTS.CONSULT_ACCEPTED,
      actorUserId: session.username,
      actorName: session.displayName,
      consultId,
      sourceOrigin: 'assist-consult',
      payload: {
        patientName: consult.patient?.name ?? null,
        patientMrn: consult.patient?.rm ?? null,
        keluhanUtama: consult.keluhan_utama ?? null,
        targetDoctorId: consult.targetDoctorId ?? null,
        acceptedAt,
      },
    })

    // Update ConsultLog status to track acceptance
    try {
      await prisma.consultLog.update({
        where: { consultId },
        data: {
          status: 'accepted',
          acceptedBy: session.displayName,
          acceptedAt: new Date(acceptedAt),
        },
      })
    } catch {
      // Silent — consult mungkin dari flow lama sebelum migrasi ConsultLog
    }

    return NextResponse.json({ ok: true, consultId })
  } catch (err) {
    console.error('[Consult] accept error:', err)
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan accept.' }, { status: 500 })
  }
}
