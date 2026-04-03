// Sentra Assist — Ghost Protocols Bridge
// POST /api/consult — receive clinical consult from Assist, route to target doctor
// Called by Assist (Chrome Extension) after perawat selects a doctor

import { type NextRequest, NextResponse } from 'next/server'

import {
  appendClinicalCaseAuditEvent,
  CLINICAL_CASE_AUDIT_EVENTS,
} from '@/lib/audit/clinical-case-audit'
import { prisma } from '@/lib/prisma'
import { getCrewSessionFromRequest, isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'
import { emitAssistConsult } from '@/lib/telemedicine/socket-bridge'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const session = getCrewSessionFromRequest(req)

  try {
    const body = await req.json()
    const {
      patient,
      ttv,
      keluhan_utama,
      risk_factors,
      anthropometrics,
      penyakit_kronis,
      target_doctor_id,
      sent_at,
    } = body

    if (!patient?.name || !keluhan_utama || !target_doctor_id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Field wajib tidak lengkap: patient.name, keluhan_utama, target_doctor_id',
        },
        { status: 400 }
      )
    }

    const consultId = `consult-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const receivedAt = new Date().toISOString()

    emitAssistConsult({
      consultId,
      targetDoctorId: String(target_doctor_id),
      sentAt: sent_at || receivedAt,
      patient,
      ttv: ttv || {},
      keluhan_utama: String(keluhan_utama),
      risk_factors: Array.isArray(risk_factors) ? risk_factors : [],
      anthropometrics: anthropometrics || {},
      penyakit_kronis: Array.isArray(penyakit_kronis) ? penyakit_kronis : [],
    })

    // Persist consult data to database for audit trail
    try {
      await prisma.consultLog.create({
        data: {
          consultId,
          status: 'received',
          patientName: patient.name,
          patientRm: patient.rm ?? null,
          patientAge: typeof patient.age === 'number' ? patient.age : null,
          patientGender: patient.gender ?? null,
          keluhanUtama: String(keluhan_utama),
          ttv: ttv || {},
          riskFactors: Array.isArray(risk_factors) ? risk_factors : [],
          penyakitKronis: Array.isArray(penyakit_kronis) ? penyakit_kronis : [],
          anthropometrics: anthropometrics || {},
          senderUserId: session?.username ?? null,
          senderName: session?.displayName ?? null,
          targetDoctorId: String(target_doctor_id),
          sentAt: sent_at ? new Date(sent_at) : new Date(),
        },
      })
    } catch (dbErr) {
      console.error('[Consult] ConsultLog write failed:', dbErr)
    }

    // Write audit event for traceability
    await appendClinicalCaseAuditEvent({
      eventType: CLINICAL_CASE_AUDIT_EVENTS.CONSULT_RECEIVED,
      actorUserId: session?.username ?? null,
      actorName: session?.displayName ?? null,
      consultId,
      sourceOrigin: 'ghost-protocols',
      payload: {
        patientName: patient.name,
        patientRm: patient.rm ?? null,
        keluhanUtama: keluhan_utama,
        targetDoctorId: target_doctor_id,
        hasTtv: Boolean(ttv && Object.keys(ttv).length > 0),
        riskFactorCount: Array.isArray(risk_factors) ? risk_factors.length : 0,
        penyakitKronisCount: Array.isArray(penyakit_kronis) ? penyakit_kronis.length : 0,
        sentAt: sent_at,
        receivedAt,
      },
    })

    return NextResponse.json({ ok: true, consultId })
  } catch (err) {
    console.error('[Consult] POST error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
