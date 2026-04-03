import 'server-only'

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export const CLINICAL_CASE_AUDIT_EVENTS = {
  CONSULT_RECEIVED: 'CONSULT_RECEIVED',
  CONSULT_ACCEPTED: 'CONSULT_ACCEPTED',
  CONSULT_TRANSFERRED_TO_EMR: 'CONSULT_TRANSFERRED_TO_EMR',
  TELEMEDICINE_DIAGNOSIS_SAVED: 'TELEMEDICINE_DIAGNOSIS_SAVED',
  TELEMEDICINE_PRESCRIPTION_SAVED: 'TELEMEDICINE_PRESCRIPTION_SAVED',
  CASE_FINALIZED: 'CASE_FINALIZED',
} as const

export type ClinicalCaseAuditEventType =
  (typeof CLINICAL_CASE_AUDIT_EVENTS)[keyof typeof CLINICAL_CASE_AUDIT_EVENTS]

export interface ClinicalCaseAuditRefs {
  appointmentId?: string | null
  consultId?: string | null
  reportId?: string | null
  sourceOrigin?: string | null
}

export interface AppendClinicalCaseAuditEventInput extends ClinicalCaseAuditRefs {
  eventType: ClinicalCaseAuditEventType
  actorUserId?: string | null
  actorName?: string | null
  payload?: Prisma.InputJsonValue
}

export async function appendClinicalCaseAuditEvent(
  input: AppendClinicalCaseAuditEventInput
): Promise<void> {
  try {
    await prisma.clinicalCaseAuditEvent.create({
      data: {
        eventType: input.eventType,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        appointmentId: input.appointmentId ?? null,
        consultId: input.consultId ?? null,
        reportId: input.reportId ?? null,
        sourceOrigin: input.sourceOrigin ?? null,
        payload: input.payload ?? {},
      },
    })
  } catch (error) {
    console.error('[ClinicalCaseAudit] Gagal menulis event audit:', {
      eventType: input.eventType,
      actorUserId: input.actorUserId,
      appointmentId: input.appointmentId,
      consultId: input.consultId,
      reportId: input.reportId,
      error,
    })
  }
}
