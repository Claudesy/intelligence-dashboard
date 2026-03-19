// Claudesy — TrajectoryMonitorPanel
/**
 * TrajectoryMonitorPanel
 *
 * Intelligence Dashboard panel untuk monitoring trajectory pasien.
 * Reads ?patient={hash} dari URL search params untuk patient selection.
 * Menampilkan TrajectoryIntelligencePanel ketika patient dipilih.
 *
 * URL param: `patient` — 64-char hex SHA-256 patient identifier hash
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { TrajectoryIntelligencePanel } from '@/components/features/trajectory'

export default function TrajectoryMonitorPanel(): React.JSX.Element {
  const searchParams = useSearchParams()
  const patientHash = searchParams.get('patient')

  // Validate: must be 64-char hex
  const isValidHash = !!patientHash && /^[0-9a-f]{64}$/.test(patientHash)

  if (!isValidHash) {
    return (
      <div
        style={{
          borderRadius: 6,
          border: '1px dashed var(--line-base)',
          padding: '28px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 8,
          }}
        >
          Clinical Momentum Engine
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Tambahkan parameter <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>?patient=</code> ke URL
          dengan 64-char patient identifier hash untuk melihat trajectory analysis.
        </p>
        <div
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            opacity: 0.5,
          }}
        >
          Format: SHA-256 hash dari No. Rekam Medis pasien
        </div>
      </div>
    )
  }

  return <TrajectoryIntelligencePanel patientIdentifier={patientHash} visitCount={5} />
}
