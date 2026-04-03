import { NextResponse } from 'next/server'
import { parseDiagnoseRequestBody } from '@/lib/cdss/diagnose-parser'
import { runDiagnosisEngine } from '@/lib/cdss/engine'
import { writeCDSSAuditEntry } from '@/lib/cdss/workflow'
import {
  getCrewAuthorizationMode,
  getCrewSessionFromRequest,
  isClinicalCrewRole,
} from '@/lib/server/crew-access-auth'
import { getRequestIp, writeSecurityAuditLog } from '@/lib/server/security-audit'

export const runtime = 'nodejs'

/**
 * Engine Diagnosis AADI V2 (Penalaran Klinis)
 * @summary Diagnosis keluhan pasien dengan penalaran klinis
 * @description Kirim data pasien lengkap (keluhan subjektif, tanda vital objektif) untuk menerima diagnosis diferensial berbantuan Artificial Intelligence.
 * 
 * @bodyParam {string} name - Nama lengkap pasien (untuk identifikasi rekam medis)
 * @bodyParam {string} age - String usia pasien (misalnya: '25 tahun')
 * @bodyParam {string} complaints - Keluhan subjektif utama yang dijelaskan oleh pasien.
 * @bodyParam {string} history - Riwayat klinis pasien dan kondisi masa lalu yang relevan.
 * @bodyParam {string} vitals - Tanda vital objektif (misalnya: 'TD 120/80, HR 80, Temp 36.5').
 * @bodyParam {string} physicalExam - Temuan dari pemeriksaan fisik.
 * @bodyParam {string} additionalInfo - Konteks klinis tambahan apa pun (opsional).
 * 
 * @example {
 *   "name": "Budi Santoso",
 *   "age": "45 tahun",
 *   "complaints": "Nyeri dada kiri seperti tertekan, menjalar ke lengan kiri sejak 1 jam lalu.",
 *   "history": "Riwayat hipertensi 5 tahun, tidak rutin minum obat.",
 *   "vitals": "TD 150/90, HR 110, RR 24, SpO2 96%",
 *   "physicalExam": "Akral dingin, ronchi halus basal paru (-).",
 *   "additionalInfo": "Pasien merokok 1 pack per hari."
 * }
 * 
 * @responseBody {object} - JSON berisi 'analysis' (penalaran) dan 'diagnosis' (rekomendasi).
 */
export async function POST(request: Request) {
  const ip = getRequestIp(request)
  const session = getCrewSessionFromRequest(request)
  const authorizationMode = getCrewAuthorizationMode(request)

  if (!session) {
    await writeSecurityAuditLog({
      endpoint: '/api/cdss/diagnose',
      action: 'CDSS_DIAGNOSE',
      result: 'unauthenticated',
      userId: null,
      role: null,
      ip,
      metadata: {
        authorizationMode,
      },
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isClinicalCrewRole(session.role) && !isClinicalCrewRole(session.profession)) {
    await writeSecurityAuditLog({
      endpoint: '/api/cdss/diagnose',
      action: 'CDSS_DIAGNOSE',
      result: 'forbidden',
      userId: session.username,
      role: session.role,
      ip,
      metadata: {
        authorizationMode,
      },
    })
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = parseDiagnoseRequestBody(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  try {
    const result = await runDiagnosisEngine(parsed.input)
    await writeCDSSAuditEntry({
      sessionId: parsed.input.session_id,
      action: 'DIAGNOSE_RESULT',
      validationStatus: result.validation_summary.requires_more_data
        ? 'needs_more_data'
        : 'completed',
      modelVersion: result.model_version,
      latencyMs: result.processing_time_ms,
      outputSummary: {
        totalDisplayed: result.suggestions.length,
        redFlagCount: result.red_flags.length,
        unverifiedCount: result.validation_summary.unverified_codes.length,
        recommendedCount: result.validation_summary.recommended_count,
        reviewCount: result.validation_summary.review_count,
        mustNotMissCount: result.validation_summary.must_not_miss_count,
        deferredCount: result.validation_summary.deferred_count,
      },
      metadata: {
        source: result.source,
        nextBestQuestionCount: result.next_best_questions.length,
        hasReasoningContent: !!result._reasoning_content,
        reasoningContentLength: result._reasoning_content?.length ?? 0,
      },
    })
    await writeSecurityAuditLog({
      endpoint: '/api/cdss/diagnose',
      action: 'CDSS_DIAGNOSE',
      result: 'success',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: {
        source: result.source,
        modelVersion: result.model_version,
        totalRawSuggestions: result.validation_summary.total_raw,
        totalValidatedSuggestions: result.validation_summary.total_validated,
        unverifiedCodes: result.validation_summary.unverified_codes,
      },
    })
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    await writeSecurityAuditLog({
      endpoint: '/api/cdss/diagnose',
      action: 'CDSS_DIAGNOSE',
      result: 'failure',
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { error: msg },
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
