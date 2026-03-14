// Designed and constructed by Claudesy.
"use client";

import type { DashboardOperationalMetrics } from "@abyss/types";

import { useOperationalMetrics } from "@/hooks/useOperationalMetrics";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatConfidence(value: number): string {
  return value.toFixed(2);
}

function buildMetricCards(
  metrics: DashboardOperationalMetrics,
): Array<{ label: string; value: string; helper: string }> {
  return [
    {
      label: "Encounter Aktif",
      value: String(metrics.totalEncounters),
      helper: metrics.shiftLabel,
    },
    {
      label: "Utilisasi CDSS",
      value: formatPercent(metrics.cdssUtilizationRate),
      helper: `${metrics.overrideCount} override tercatat`,
    },
    {
      label: "Kesiapan E-Klaim",
      value: formatPercent(metrics.eklaimReadinessRate),
      helper: `Updated ${new Date(metrics.generatedAt).toLocaleTimeString(
        "id-ID",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      )}`,
    },
    {
      label: "Avg. Confidence",
      value: formatConfidence(metrics.averageConfidenceScore),
      helper: `Override rate ${formatPercent(metrics.overrideRate)}`,
    },
  ];
}

export function OperationalSummaryPanelContent({
  metrics,
}: {
  metrics: DashboardOperationalMetrics;
}): React.JSX.Element {
  const cards = buildMetricCards(metrics);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((metric) => (
        <article
          key={metric.label}
          className="rounded-md border border-[var(--line-base)] px-4 py-4"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {metric.label}
          </p>
          <p className="mt-2 text-2xl font-medium text-[var(--text-main)]">
            {metric.value}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {metric.helper}
          </p>
        </article>
      ))}
    </div>
  );
}

export default function OperationalSummaryPanel(): React.JSX.Element {
  const { metrics, isLoading, error } = useOperationalMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-[96px] animate-pulse rounded-md border border-[var(--line-base)] bg-[var(--bg-card)]"
          />
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <p className="rounded-md border border-dashed border-[var(--c-critical)] px-4 py-3 text-sm text-[var(--c-critical)]">
        {error ?? "Ringkasan operasional belum tersedia."}
      </p>
    );
  }

  return <OperationalSummaryPanelContent metrics={metrics} />;
}
