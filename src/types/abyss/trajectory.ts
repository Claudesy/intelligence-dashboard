// Claudesy — Clinical Trajectory Types
/**
 * Trajectory API Types
 *
 * Re-exports CME (Clinical Momentum Engine) types for use in UI components
 * and the trajectory API route. These are app-specific types — not shared
 * across packages, as trajectory analysis is exclusive to primary-healthcare.
 *
 * Contract: GET /api/patients/[id]/trajectory
 *   → returns ApiResponse<TrajectoryAnalysis>
 */

import { z } from 'zod'

// ── Re-export core CME types for component consumption ────────────────────────
// Components should import from here, not directly from lib/clinical/
export type {
  ConfirmedChronicDiagnosis,
  ClinicalSafeOutput,
  GlobalDeterioration,
  MortalityProxyRisk,
  MortalityProxyTier,
  RiskLevel,
  TimeToCriticalEstimate,
  TrajectoryAnalysis,
  TrajectoryRecommendation,
  TrajectoryVolatility,
  TrendDirection,
  VitalTrend,
  AcuteAttackRisk24h,
  EarlyWarningBurden,
  ClinicalUrgencyTier,
  GlobalDeteriorationState,
} from '@/lib/clinical/trajectory-analyzer'

export type {
  MomentumAnalysis,
  MomentumLevel,
  ParamMomentum,
  VitalParam,
} from '@/lib/clinical/momentum-engine'

export type {
  ConvergencePattern,
  ConvergenceResult,
  ConvergenceParam,
} from '@/lib/clinical/convergence-detector'

export type { PersonalBaseline, BaselineStat, BaselineParam } from '@/lib/clinical/personal-baseline'

// ── Zod schemas for API query param validation ────────────────────────────────

/** Validates the patient identifier hash in /api/patients/[id]/trajectory */
export const PatientIdentifierSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, 'Invalid patient identifier: must be 64-char hex SHA-256 hash')

/** Validates the ?visits= query param */
export const TrajectoryQuerySchema = z.object({
  visits: z
    .string()
    .optional()
    .transform(v => (v ? Math.min(Math.max(1, parseInt(v, 10) || 5), 10) : 5)),
})

export type TrajectoryQuery = z.infer<typeof TrajectoryQuerySchema>

// ── Momentum level display config ─────────────────────────────────────────────

export const MOMENTUM_LEVEL_CONFIG = {
  INSUFFICIENT_DATA: {
    label: 'Data Tidak Cukup',
    color: 'var(--text-muted)',
    bg: 'var(--bg-card)',
    severity: 0,
  },
  PRELIMINARY: {
    label: 'Awal',
    color: 'var(--text-muted)',
    bg: 'var(--bg-card)',
    severity: 1,
  },
  STABLE: {
    label: 'Stabil',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    severity: 2,
  },
  DRIFTING: {
    label: 'Melayang',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.1)',
    severity: 3,
  },
  ACCELERATING: {
    label: 'Akselerasi',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
    severity: 4,
  },
  CONVERGING: {
    label: 'Konvergen',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    severity: 5,
  },
  CRITICAL_MOMENTUM: {
    label: 'Momentum Kritis',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.15)',
    severity: 6,
  },
} as const

export const CONVERGENCE_PATTERN_LABELS: Record<string, string> = {
  cardiovascular: 'Konvergensi Kardiovaskular',
  shock: 'Pola Syok',
  sepsis_like: 'Suspek Sepsis',
  hypertensive_crisis: 'Krisis Hipertensi',
  metabolic_crisis: 'Krisis Metabolik',
  respiratory: 'Distres Respirasi',
  multi_system: 'Multi-Sistem',
  none: '',
}

export const RISK_LEVEL_CONFIG = {
  low: { label: 'Rendah', color: '#10b981' },
  moderate: { label: 'Sedang', color: '#eab308' },
  high: { label: 'Tinggi', color: '#f97316' },
  critical: { label: 'Kritis', color: '#ef4444' },
} as const

export const URGENCY_TIER_CONFIG = {
  low: { label: 'Rutin 24J', color: '#10b981' },
  moderate: { label: 'Review Hari Ini', color: '#eab308' },
  high: { label: 'Urgent <6J', color: '#f97316' },
  immediate: { label: 'SEGERA', color: '#dc2626' },
} as const

export const MORTALITY_TIER_CONFIG = {
  low: { label: 'Risiko Rendah', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  moderate: { label: 'Risiko Sedang', color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  high: { label: 'Risiko Tinggi', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  very_high: { label: 'Risiko Sangat Tinggi', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
} as const

// ── ETA display helpers ───────────────────────────────────────────────────────

export function formatETAHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return '< 1 jam'
  if (hours < 24) return `~${Math.round(hours)} jam`
  const days = Math.floor(hours / 24)
  const remaining = Math.round(hours % 24)
  return remaining > 0 ? `~${days}h ${remaining}j` : `~${days} hari`
}

export function getETAUrgencyColor(hours: number | null): string {
  if (hours === null) return 'var(--text-muted)'
  if (hours < 24) return '#ef4444'
  if (hours < 72) return '#f97316'
  if (hours < 168) return '#eab308'
  return '#10b981'
}

// ── Vital parameter labels (Bahasa Indonesia) ─────────────────────────────────

export const VITAL_PARAM_LABELS: Record<string, { label: string; unit: string }> = {
  sbp: { label: 'Sistolik', unit: 'mmHg' },
  dbp: { label: 'Diastolik', unit: 'mmHg' },
  hr: { label: 'Denyut Nadi', unit: 'x/mnt' },
  rr: { label: 'Laju Napas', unit: 'x/mnt' },
  temp: { label: 'Suhu', unit: '°C' },
  glucose: { label: 'GDS', unit: 'mg/dL' },
  spo2: { label: 'SpO₂', unit: '%' },
}

export const ACUTE_RISK_LABELS: Record<string, string> = {
  hypertensive_crisis_risk: 'Krisis Hipertensi',
  glycemic_crisis_risk: 'Krisis Glikemik',
  sepsis_like_deterioration_risk: 'Suspek Sepsis',
  shock_decompensation_risk: 'Syok',
  stroke_acs_suspicion_risk: 'Stroke / ACS',
}
