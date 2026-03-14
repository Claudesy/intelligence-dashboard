"use client";

import { useEncounterQueue } from "@/hooks/useEncounterQueue";
import {
  getIntelligenceEventStatusLabel,
  type IntelligenceEventStatus,
} from "@/lib/intelligence/socket-payload";

import { useSharedIntelligenceSocket } from "./IntelligenceSocketProvider";

// ── Status config: icon + warna via CSS vars ────────────────────────────────

interface StatusConfig {
  indicator: string; // unicode indicator
  badgeClass: string; // tailwind classes untuk badge
  rowClass: string; // tailwind classes untuk border kiri card
}

const STATUS_CONFIG: Record<IntelligenceEventStatus, StatusConfig> = {
  in_consultation: {
    indicator: "●",
    badgeClass: "border-[var(--c-asesmen)] text-[var(--c-asesmen)]",
    rowClass: "border-l-2 border-l-[var(--c-asesmen)]",
  },
  cdss_pending: {
    indicator: "◐",
    badgeClass: "border-[var(--c-cdss,#E67E22)] text-[var(--c-cdss,#E67E22)]",
    rowClass: "border-l-2 border-l-[var(--c-cdss,#E67E22)]",
  },
  documentation_incomplete: {
    indicator: "⚠",
    badgeClass: "border-[var(--c-critical)] text-[var(--c-critical)]",
    rowClass: "border-l-2 border-l-[var(--c-critical)]",
  },
  waiting: {
    indicator: "○",
    badgeClass: "border-[var(--line-base)] text-[var(--text-muted)]",
    rowClass: "border-l-2 border-l-[var(--line-base)]",
  },
  completed: {
    indicator: "✓",
    badgeClass: "border-[var(--line-base)] text-[var(--text-muted)]",
    rowClass: "border-l-2 border-l-transparent opacity-60",
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function PatientQueuePanel(): React.JSX.Element {
  const socket = useSharedIntelligenceSocket();
  const { encounters, isLoading, error, isStale, retry } =
    useEncounterQueue(socket);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-md border border-[var(--line-base)] bg-[var(--bg-card)]"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md border border-dashed border-[var(--c-critical)] px-4 py-3 text-sm text-[var(--c-critical)]">
          {error}
        </p>
        <button
          type="button"
          onClick={retry}
          className="self-start rounded-md border border-[var(--line-base)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--c-asesmen)] hover:text-[var(--c-asesmen)] focus:outline-none focus:ring-2 focus:ring-[var(--c-asesmen)] focus:ring-offset-2"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (encounters.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-[var(--text-muted)]">
        Tidak ada encounter aktif saat ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Stale data warning — shown when socket is disconnected */}
      {isStale && (
        <p
          role="status"
          className="rounded-md border border-dashed border-[var(--line-base)] px-3 py-2 text-[11px] text-[var(--text-muted)]"
        >
          ⚠ Koneksi terputus — data mungkin tidak terbaru.
        </p>
      )}

      {encounters.map((item) => {
        const cfg = STATUS_CONFIG[item.status];
        return (
          <article
            key={item.encounterId}
            className={`rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-4 py-3 ${cfg.rowClass}`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {item.encounterId}
                </p>
                <h3 className="mt-1 truncate text-sm font-medium text-[var(--text-main)]">
                  {item.patientLabel}
                </h3>
              </div>

              {/* Status badge */}
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${cfg.badgeClass}`}
              >
                <span aria-hidden="true">{cfg.indicator}</span>
                {getIntelligenceEventStatusLabel(item.status)}
              </span>
            </div>

            {/* Note */}
            {item.note && (
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
                {item.note}
              </p>
            )}

            {/* Timestamp */}
            <p className="mt-2 text-[10px] text-[var(--text-muted)]">
              {new Date(item.timestamp).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </article>
        );
      })}
    </div>
  );
}
