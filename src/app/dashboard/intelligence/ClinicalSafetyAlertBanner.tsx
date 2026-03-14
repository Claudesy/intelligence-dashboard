"use client";

import { useCriticalAlertBanner } from "@/hooks/useCriticalAlertBanner";
import type { IntelligenceEventPayload } from "@/lib/intelligence/types";

import { useSharedIntelligenceSocket } from "./IntelligenceSocketProvider";

// ── Sub-states ────────────────────────────────────────────────────────────────

function QuiescentBanner(): React.JSX.Element {
  return (
    <section className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--c-critical)]">
            Clinical Safety Alert
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-main)]">
            Belum ada alert kritis aktif.
          </p>
        </div>
        <div className="rounded-md border border-dashed border-[var(--line-base)] px-4 py-3 text-sm text-[var(--text-muted)]">
          Cross-panel visibility aktif.
        </div>
      </div>
    </section>
  );
}

function ActiveAlertBanner({
  message,
  encounterId,
  onAcknowledge,
}: {
  message: string;
  encounterId: string;
  onAcknowledge: () => void;
}): React.JSX.Element {
  return (
    <section
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="rounded-md border border-[var(--c-critical)] bg-[var(--bg-card)] px-5 py-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-xl leading-none text-[var(--c-critical)]"
          >
            ⚠
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--c-critical)]">
              Clinical Safety Alert — Kritis
            </p>
            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {encounterId}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-main)]">
              {message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAcknowledge}
          aria-label="Acknowledge alert kritis ini"
          className="shrink-0 rounded-md border border-[var(--c-critical)] px-4 py-2 text-sm font-medium text-[var(--c-critical)] transition-opacity hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--c-critical)] focus:ring-offset-2"
        >
          Acknowledge
        </button>
      </div>
    </section>
  );
}

function AcknowledgedBanner({
  acknowledgedAt,
}: {
  acknowledgedAt: string;
}): React.JSX.Element {
  const time = new Date(acknowledgedAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-5 py-4 opacity-60"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-base text-[var(--text-muted)]">
          ✓
        </span>
        <p className="text-sm text-[var(--text-muted)]">
          Alert kritis telah di-acknowledge pada {time}.
        </p>
      </div>
    </section>
  );
}

// ── View (pure — testable tanpa socket) ──────────────────────────────────────

export interface ClinicalSafetyAlertBannerViewProps {
  activeAlert: IntelligenceEventPayload | null;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
  onAcknowledge: () => void;
}

export function ClinicalSafetyAlertBannerView({
  activeAlert,
  isAcknowledged,
  acknowledgedAt,
  onAcknowledge,
}: ClinicalSafetyAlertBannerViewProps): React.JSX.Element {
  if (!activeAlert) {
    return <QuiescentBanner />;
  }

  if (isAcknowledged && acknowledgedAt) {
    return <AcknowledgedBanner acknowledgedAt={acknowledgedAt} />;
  }

  const message =
    typeof activeAlert.data.message === "string"
      ? activeAlert.data.message
      : "Alert kritis diterima. Tindak lanjut segera.";

  return (
    <ActiveAlertBanner
      message={message}
      encounterId={activeAlert.encounterId}
      onAcknowledge={onAcknowledge}
    />
  );
}

// ── Container (wires socket + hook → view) ────────────────────────────────────

export default function ClinicalSafetyAlertBanner(): React.JSX.Element {
  const socket = useSharedIntelligenceSocket();
  const { activeAlert, isAcknowledged, acknowledgedAt, handleAcknowledge } =
    useCriticalAlertBanner(socket);

  return (
    <ClinicalSafetyAlertBannerView
      activeAlert={activeAlert}
      isAcknowledged={isAcknowledged}
      acknowledgedAt={acknowledgedAt}
      onAcknowledge={handleAcknowledge}
    />
  );
}
