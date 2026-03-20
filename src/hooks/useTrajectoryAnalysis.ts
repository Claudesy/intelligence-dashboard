// Claudesy — useTrajectoryAnalysis Hook
/**
 * useTrajectoryAnalysis
 *
 * TanStack Query hook that fetches CME trajectory analysis for a patient
 * from GET /api/patients/[id]/trajectory.
 *
 * Usage:
 *   const { data, isLoading, error } = useTrajectoryAnalysis(patientIdentifier)
 *
 * @param patientIdentifier - 64-char hex SHA-256 hash (from buildPatientIdentifierHash)
 * @param visitCount        - Number of visits to analyze (default 5, max 10)
 */

'use client'

import { useEffect, useState } from 'react'
import type { TrajectoryAnalysis, VitalSnapshot, MomentumSnapshot } from '@/types/abyss/trajectory'

type UseTrajectoryAnalysisResult = {
  data: TrajectoryAnalysis | undefined
  visitHistory: VitalSnapshot[]
  momentumHistory: MomentumSnapshot[]
  isLoading: boolean
  error: Error | null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTrajectoryAnalysis(
  patientIdentifier: string | null | undefined,
  visitCount = 5
): UseTrajectoryAnalysisResult {
  const [data, setData] = useState<TrajectoryAnalysis | undefined>(undefined)
  const [visitHistory, setVisitHistory] = useState<VitalSnapshot[]>([])
  const [momentumHistory, setMomentumHistory] = useState<MomentumSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const isEnabled = !!patientIdentifier && /^[0-9a-f]{64}$/.test(patientIdentifier)
    if (!isEnabled) {
      setData(undefined)
      setError(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()

    async function load(): Promise<void> {
      try {
        setIsLoading(true)
        setError(null)
        const visits = Math.min(Math.max(1, visitCount), 10)
        const res = await fetch(`/api/patients/${patientIdentifier}/trajectory?visits=${visits}`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(
            (body as { error?: string }).error ?? `Trajectory fetch failed (${res.status})`
          )
        }

        const json = (await res.json()) as {
          success: boolean
          data: TrajectoryAnalysis
          visit_history?: VitalSnapshot[]
          momentum_history?: MomentumSnapshot[]
          error?: string
        }

        if (!json.success || !json.data) {
          throw new Error(json.error ?? 'Trajectory analysis unavailable')
        }

        setData(json.data)
        setVisitHistory(json.visit_history ?? [])
        setMomentumHistory(json.momentum_history ?? [])
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setData(undefined)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [patientIdentifier, visitCount])

  return { data, visitHistory, momentumHistory, isLoading, error }
}
