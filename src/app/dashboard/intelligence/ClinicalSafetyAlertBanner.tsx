"use client";

import { useCriticalAlertBanner } from "@/hooks/useCriticalAlertBanner";
import type { IntelligenceEventPayload } from "@/lib/intelligence/types";

import { useSharedIntelligenceSocket } from "./IntelligenceSocketProvider";

// ── Sub-states ────────────────────────────────────────────────────────────────

function QuiescentBanner(): React.JSX.Element {
  return (
    <section
      style={{
        borderRadius: 6,
        border: "1px solid var(--line-base)",
        background: "var(--bg-card)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--c-critical)",
            marginBottom: 8,
          }}
        >
          Clinical Safety Alert
        </div>
        <div style={{ fontSize: 14, color: "var(--text-main)" }}>
          Belum ada alert kritis aktif.
        </div>
      </div>
      <div
        style={{
          borderRadius: 4,
          border: "1px dashed var(--line-base)",
          padding: "8px 14px",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
          letterSpacing: "0.05em",
        }}
      >
        Cross-panel visibility aktif
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
      style={{
        borderRadius: 6,
        border: "1px solid var(--c-critical)",
        background: "var(--bg-card)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{ fontSize: 20, color: "var(--c-critical)", lineHeight: 1, flexShrink: 0 }}
        >
          ⚠
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--c-critical)",
              marginBottom: 4,
            }}
          >
            Clinical Safety Alert — Kritis
          </div>
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              opacity: 0.6,
              marginBottom: 8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {encounterId}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-main)" }}>
            {message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAcknowledge}
        aria-label="Acknowledge alert kritis ini"
        style={{
          flexShrink: 0,
          borderRadius: 4,
          border: "1px solid var(--c-critical)",
          padding: "8px 16px",
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          fontWeight: 500,
          color: "var(--c-critical)",
          background: "transparent",
          cursor: "pointer",
          letterSpacing: "0.05em",
          transition: "opacity 0.2s",
        }}
      >
        Acknowledge
      </button>
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
      style={{
        borderRadius: 6,
        border: "1px solid var(--line-base)",
        background: "var(--bg-card)",
        padding: "16px 20px",
        opacity: 0.6,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        aria-hidden="true"
        style={{ fontSize: 16, color: "var(--text-muted)" }}
      >
        ✓
      </span>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
        Alert kritis telah di-acknowledge pada {time}.
      </span>
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
  if (!activeAlert) return <QuiescentBanner />;
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

// ── Container ────────────────────────────────────────────────────────────────

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
