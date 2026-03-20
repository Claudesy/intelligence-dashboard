// Claudesy — AcuteAttackRiskGrid
/**
 * AcuteAttackRiskGrid
 *
 * Displays 5 acute attack risk scores (0–100) as a badge grid.
 * Color-coded: 0–30 green, 30–60 amber, 60–80 orange, 80+ red.
 */

'use client'

import { useState } from 'react'
import type { AcuteAttackRisk24h } from '@/types/abyss/trajectory'
import { ACUTE_RISK_LABELS } from '@/types/abyss/trajectory'
import { AcuteAttackRiskRadar } from './AcuteAttackRiskRadar'

interface AcuteAttackRiskGridProps {
  risks: AcuteAttackRisk24h
  className?: string
}

function getRiskColor(score: number): string {
  if (score >= 80) return '#dc2626'
  if (score >= 60) return '#ef4444'
  if (score >= 30) return '#f97316'
  return '#10b981'
}

function getRiskBg(score: number): string {
  if (score >= 80) return 'rgba(220,38,38,0.12)'
  if (score >= 60) return 'rgba(239,68,68,0.1)'
  if (score >= 30) return 'rgba(249,115,22,0.1)'
  return 'rgba(16,185,129,0.08)'
}

const RISK_ENTRIES: { key: keyof AcuteAttackRisk24h; labelKey: string }[] = [
  { key: 'hypertensive_crisis_risk', labelKey: 'hypertensive_crisis_risk' },
  { key: 'glycemic_crisis_risk', labelKey: 'glycemic_crisis_risk' },
  { key: 'sepsis_like_deterioration_risk', labelKey: 'sepsis_like_deterioration_risk' },
  { key: 'shock_decompensation_risk', labelKey: 'shock_decompensation_risk' },
  { key: 'stroke_acs_suspicion_risk', labelKey: 'stroke_acs_suspicion_risk' },
]

export function AcuteAttackRiskGrid({ risks, className }: AcuteAttackRiskGridProps) {
  const [showRadar, setShowRadar] = useState(false)

  return (
    <div
      className={className}
      style={{
        borderRadius: 8,
        border: '1px solid var(--line-base)',
        background: 'var(--bg-card)',
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Risiko Serangan Akut 24J
        </div>
        <button
          onClick={() => setShowRadar((v) => !v)}
          aria-label={showRadar ? 'Tampilkan grid' : 'Tampilkan radar'}
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            background: 'none',
            border: '1px solid var(--line-base)',
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          {showRadar ? 'Grid' : 'Radar'}
        </button>
      </div>

      {showRadar ? (
        <AcuteAttackRiskRadar risks={risks} />
      ) : (

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
        }}
      >
        {RISK_ENTRIES.map(({ key, labelKey }) => {
          const score = Math.round(risks[key])
          const color = getRiskColor(score)
          const bg = getRiskBg(score)
          const label = ACUTE_RISK_LABELS[labelKey] ?? labelKey

          return (
            <div
              key={key}
              style={{
                borderRadius: 6,
                border: `1px solid ${color}40`,
                background: bg,
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  lineHeight: 1.3,
                  marginBottom: 6,
                }}
              >
                {label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color,
                    lineHeight: 1,
                  }}
                >
                  {score}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</span>
              </div>
              {/* Mini bar */}
              <div
                style={{
                  marginTop: 6,
                  height: 3,
                  borderRadius: 2,
                  background: 'var(--line-base)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${score}%`,
                    background: color,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
