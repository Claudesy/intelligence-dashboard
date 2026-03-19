// Claudesy — ConvergencePatternAlert
/**
 * ConvergencePatternAlert
 *
 * Displays the detected multi-parameter convergence pattern with name,
 * severity, affected vitals, and narrative in Bahasa Indonesia.
 * Only renders when convergence.shouldAlert is true.
 */

'use client'

import type { ConvergenceResult } from '@/types/abyss/trajectory'
import { CONVERGENCE_PATTERN_LABELS, VITAL_PARAM_LABELS } from '@/types/abyss/trajectory'

interface ConvergencePatternAlertProps {
  convergence: ConvergenceResult
  className?: string
}

const SEVERITY_COLOR: Record<string, string> = {
  low: '#eab308',
  moderate: '#f97316',
  high: '#ef4444',
  critical: '#dc2626',
}

export function ConvergencePatternAlert({ convergence, className }: ConvergencePatternAlertProps) {
  if (!convergence.shouldAlert || convergence.pattern === 'none') return null

  const label = CONVERGENCE_PATTERN_LABELS[convergence.pattern] ?? convergence.pattern
  const severityColor = SEVERITY_COLOR[String(convergence.convergenceScore >= 3 ? 'high' : convergence.convergenceScore >= 2 ? 'moderate' : 'low')] ?? '#eab308'

  return (
    <div
      role="alert"
      aria-live="polite"
      className={className}
      style={{
        borderRadius: 8,
        border: `1px solid ${severityColor}60`,
        background: `${severityColor}10`,
        padding: '16px 20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span aria-hidden="true" style={{ fontSize: 16, color: severityColor }}>⚡</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 2,
            }}
          >
            Pola Konvergensi Terdeteksi
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: severityColor }}>
            {label}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: severityColor,
            border: `1px solid ${severityColor}60`,
            borderRadius: 4,
            padding: '2px 8px',
          }}
        >
          {convergence.convergenceScore} param
        </div>
      </div>

      {/* Narrative */}
      <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.55, margin: '0 0 10px' }}>
        {convergence.narrative}
      </p>

      {/* Affected params chips */}
      {convergence.worseningParams.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {convergence.worseningParams.map(param => (
            <span
              key={param}
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: severityColor,
                background: `${severityColor}15`,
                border: `1px solid ${severityColor}40`,
                borderRadius: 4,
                padding: '2px 8px',
              }}
            >
              {VITAL_PARAM_LABELS[param]?.label ?? param} ↑
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
