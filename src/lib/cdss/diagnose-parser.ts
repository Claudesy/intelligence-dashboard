// Architected and built by the one and only Claudesy.
import type { CDSSEngineInput, CDSSTrajectoryContext } from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTrajectoryContext(value: unknown): CDSSTrajectoryContext | undefined {
  if (!value || typeof value !== 'object') return undefined
  const ctx = value as Record<string, unknown>
  if (
    typeof ctx.momentumLevel !== 'string' ||
    typeof ctx.convergencePattern !== 'string' ||
    typeof ctx.convergenceScore !== 'number' ||
    !Array.isArray(ctx.worseningParams) ||
    typeof ctx.isAccelerating !== 'boolean' ||
    (ctx.timeToCriticalDays !== null && typeof ctx.timeToCriticalDays !== 'number') ||
    typeof ctx.treatmentResponseNote !== 'string' ||
    typeof ctx.narrative !== 'string'
  ) {
    return undefined
  }
  return {
    momentumLevel: ctx.momentumLevel,
    convergencePattern: ctx.convergencePattern,
    convergenceScore: ctx.convergenceScore,
    worseningParams: ctx.worseningParams as string[],
    isAccelerating: ctx.isAccelerating,
    timeToCriticalDays: ctx.timeToCriticalDays as number | null,
    treatmentResponseNote: ctx.treatmentResponseNote,
    narrative: ctx.narrative,
    visitCount: typeof ctx.visitCount === 'number' ? ctx.visitCount : undefined,
  }
}

function parseStructuredSignsText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!value || typeof value !== 'object') return undefined
  const signs = value as Record<string, unknown>
  const parts: string[] = []
  const summarise = (label: string, obj: unknown) => {
    if (!obj || typeof obj !== 'object') return
    const details = Object.entries(obj as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== false)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    if (details) parts.push(`${label}: ${details}`)
  }
  summarise('Distress pernapasan', signs.respiratoryDistress)
  summarise('HMOD', signs.hmod)
  summarise('DKA/HHS', signs.dkaHhs)
  summarise('Syok/Perfusi', signs.perfusionShock)
  return parts.length > 0 ? parts.join('\n') : undefined
}

export type DiagnoseRequestParseResult =
  | { ok: true; input: CDSSEngineInput }
  | { ok: false; error: string; status: number }

export function parseDiagnoseRequestBody(body: unknown): DiagnoseRequestParseResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body harus berupa JSON object', status: 400 }
  }

  const b = body as Record<string, unknown>

  if (typeof b.keluhan_utama !== 'string' || !b.keluhan_utama.trim()) {
    return {
      ok: false,
      error: 'keluhan_utama wajib diisi (string)',
      status: 400,
    }
  }

  const usia = Number(b.usia)
  if (!Number.isFinite(usia) || usia <= 0 || usia > 150) {
    return { ok: false, error: 'usia wajib diisi (angka 1-150)', status: 400 }
  }

  if (b.jenis_kelamin !== 'L' && b.jenis_kelamin !== 'P') {
    return {
      ok: false,
      error: "jenis_kelamin harus 'L' atau 'P'",
      status: 400,
    }
  }

  if (b.jenis_kelamin === 'L' && b.is_pregnant === true) {
    return {
      ok: false,
      error: 'is_pregnant tidak valid untuk pasien laki-laki',
      status: 400,
    }
  }

  return {
    ok: true,
    input: {
      keluhan_utama: b.keluhan_utama.trim(),
      keluhan_tambahan:
        typeof b.keluhan_tambahan === 'string' ? b.keluhan_tambahan.trim() : undefined,
      assessment_conclusion:
        typeof b.assessment_conclusion === 'string' ? b.assessment_conclusion.trim() : undefined,
      usia,
      jenis_kelamin: b.jenis_kelamin,
      vital_signs:
        b.vital_signs && typeof b.vital_signs === 'object'
          ? (b.vital_signs as CDSSEngineInput['vital_signs'])
          : undefined,
      allergies: Array.isArray(b.allergies) ? (b.allergies as string[]) : undefined,
      chronic_diseases: Array.isArray(b.chronic_diseases)
        ? (b.chronic_diseases as string[])
        : undefined,
      is_pregnant: typeof b.is_pregnant === 'boolean' ? b.is_pregnant : undefined,
      current_drugs: Array.isArray(b.current_drugs) ? (b.current_drugs as string[]) : undefined,
      session_id: typeof b.session_id === 'string' ? b.session_id : undefined,
      trajectory_context: parseTrajectoryContext(b.trajectory_context),
      structured_signs_text: parseStructuredSignsText(b.structured_signs ?? b.structured_signs_text),
    },
  }
}
