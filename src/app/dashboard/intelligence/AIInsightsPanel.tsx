// Designed and constructed by Claudesy.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildAIInsightsSnapshot,
  type AIInsightsSnapshot,
} from "@/lib/intelligence/ai-insights";
import {
  buildSnapshotObservabilityPayload,
  canDispatchObservabilityFingerprint,
  getObservabilityFingerprint,
  markObservabilityDeliveryFailed,
  markObservabilityDeliveryPending,
  markObservabilityDeliverySucceeded,
  type ObservabilityDeliveryState,
} from "@/lib/intelligence/observability";

import { AIDisclosureBadge } from "./AIDisclosureBadge";
import { useSharedIntelligenceSocket } from "./IntelligenceSocketProvider";

type OverrideAction = "accept" | "modify" | "reject";

export interface OverrideDraftState {
  finalIcd: string;
  reason: string;
  status: "idle" | "submitting" | "success" | "error";
  message: string | null;
}

type OverrideStateMap = Record<string, OverrideDraftState>;

const DEFAULT_DRAFT_STATE: OverrideDraftState = {
  finalIcd: "",
  reason: "",
  status: "idle",
  message: null,
};

function getDraftState(
  overrideState: OverrideStateMap,
  suggestionId: string,
): OverrideDraftState {
  return overrideState[suggestionId] ?? DEFAULT_DRAFT_STATE;
}

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AIInsightsPanelContent({
  snapshot,
  overrideState,
  onDraftChange,
  onSubmitOverride,
}: {
  snapshot: AIInsightsSnapshot;
  overrideState: OverrideStateMap;
  onDraftChange?: (
    suggestionId: string,
    patch: Partial<Pick<OverrideDraftState, "finalIcd" | "reason">>,
  ) => void;
  onSubmitOverride: (
    suggestionId: string,
    action: OverrideAction,
  ) => Promise<void>;
}): React.JSX.Element {
  if (snapshot.isIdle) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-dashed border-[var(--line-base)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Idle State
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-main)]">
            Menunggu event CDSS pertama untuk encounter aktif.
          </p>
        </div>
      </div>
    );
  }

  if (snapshot.isDegraded) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-dashed border-[var(--c-critical)]/50 bg-[var(--bg-card)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-critical)]">
            Degraded State
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-main)]">
            {snapshot.degradedMessage}
          </p>
        </div>
        {snapshot.validation.violations.length > 0 && (
          <div className="rounded-md border border-[var(--line-base)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Guardrail Findings
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
              {snapshot.validation.violations.map((violation) => (
                <li key={violation.code}>
                  {violation.code}: {violation.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-md border border-[var(--line-base)] px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <AIDisclosureBadge />
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Engine {snapshot.engineVersion ?? "unknown"}
          </span>
        </div>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Processed {formatDateTime(snapshot.processedAt)} · Latency{" "}
          {snapshot.latencyMs ?? 0}ms
        </p>
      </div>

      {snapshot.alerts.length > 0 && (
        <div className="rounded-md border border-[var(--c-critical)]/35 bg-[var(--bg-card)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-critical)]">
            Clinical Alerts
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-main)]">
            {snapshot.alerts.map((alert) => (
              <li key={alert.id}>{alert.message}</li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.validation.warnings.length > 0 && (
        <div className="rounded-md border border-[var(--line-base)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Guardrail Warnings
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
            {snapshot.validation.warnings.map((warning) => (
              <li key={warning.code}>
                {warning.code}: {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {snapshot.suggestions.map((suggestion) => {
          const draftState = getDraftState(overrideState, suggestion.id);

          return (
            <article
              key={suggestion.id}
              className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-4 py-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--line-base)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {suggestion.primaryDiagnosis.icd10Code}
                    </span>
                    <span className="rounded-full border border-[var(--c-asesmen)]/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--c-asesmen)]">
                      Confidence {formatConfidence(suggestion.confidence)}
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {suggestion.disclosureLabel}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-[var(--text-main)]">
                      {suggestion.primaryDiagnosis.description}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      {suggestion.reasoning}
                    </p>
                  </div>
                  {suggestion.supportingEvidence.length > 0 && (
                    <ul className="space-y-2 text-sm leading-6 text-[var(--text-muted)]">
                      {suggestion.supportingEvidence.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                <label className="space-y-2 text-sm text-[var(--text-main)]">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Final ICD-10
                  </span>
                  <input
                    value={draftState.finalIcd}
                    onChange={(event) =>
                      onDraftChange?.(suggestion.id, {
                        finalIcd: event.target.value,
                      })
                    }
                    placeholder={suggestion.primaryDiagnosis.icd10Code}
                    className="w-full rounded-md border border-[var(--line-base)] bg-transparent px-3 py-2 text-sm text-[var(--text-main)] outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-[var(--text-main)]">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Alasan override
                  </span>
                  <input
                    value={draftState.reason}
                    onChange={(event) =>
                      onDraftChange?.(suggestion.id, {
                        reason: event.target.value,
                      })
                    }
                    placeholder="Opsional untuk accept, wajib secara operasional untuk modify/reject."
                    className="w-full rounded-md border border-[var(--line-base)] bg-transparent px-3 py-2 text-sm text-[var(--text-main)] outline-none"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onSubmitOverride(suggestion.id, "accept")}
                  disabled={draftState.status === "submitting"}
                  className="rounded-md border border-[var(--c-asesmen)] px-3 py-2 text-sm text-[var(--c-asesmen)] disabled:opacity-60"
                >
                  Terima suggestion
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitOverride(suggestion.id, "modify")}
                  disabled={draftState.status === "submitting"}
                  className="rounded-md border border-[var(--line-base)] px-3 py-2 text-sm text-[var(--text-main)] disabled:opacity-60"
                >
                  Simpan override
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitOverride(suggestion.id, "reject")}
                  disabled={draftState.status === "submitting"}
                  className="rounded-md border border-[var(--c-critical)] px-3 py-2 text-sm text-[var(--c-critical)] disabled:opacity-60"
                >
                  Tolak suggestion
                </button>
              </div>

              {draftState.message && (
                <p
                  className={`mt-3 text-sm ${
                    draftState.status === "error"
                      ? "text-[var(--c-critical)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {draftState.message}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function AIInsightsPanel(): React.JSX.Element {
  const socket = useSharedIntelligenceSocket();
  const snapshot = useMemo(
    () => buildAIInsightsSnapshot(socket.lastCdssSuggestion),
    [socket.lastCdssSuggestion],
  );
  const observabilityDeliveryRef = useRef<ObservabilityDeliveryState>({
    pendingFingerprint: null,
    reportedFingerprint: null,
  });
  const [overrideState, setOverrideState] = useState<OverrideStateMap>({});

  useEffect(() => {
    const payload = buildSnapshotObservabilityPayload(snapshot);
    if (!payload) {
      return;
    }

    const fingerprint = getObservabilityFingerprint(payload);
    if (
      !canDispatchObservabilityFingerprint(
        observabilityDeliveryRef.current,
        fingerprint,
      )
    ) {
      return;
    }

    observabilityDeliveryRef.current = markObservabilityDeliveryPending(
      observabilityDeliveryRef.current,
      fingerprint,
    );

    void fetch("/api/dashboard/intelligence/observability", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to report intelligence observability.");
        }

        observabilityDeliveryRef.current = markObservabilityDeliverySucceeded(
          observabilityDeliveryRef.current,
          fingerprint,
        );
      })
      .catch(() => {
        observabilityDeliveryRef.current = markObservabilityDeliveryFailed(
          observabilityDeliveryRef.current,
          fingerprint,
        );
      });
  }, [snapshot]);

  function updateDraft(
    suggestionId: string,
    patch: Partial<Pick<OverrideDraftState, "finalIcd" | "reason">>,
  ): void {
    setOverrideState((current) => ({
      ...current,
      [suggestionId]: {
        ...getDraftState(current, suggestionId),
        ...patch,
        status: "idle",
        message: null,
      },
    }));
  }

  async function submitOverride(
    suggestionId: string,
    action: OverrideAction,
  ): Promise<void> {
    const suggestion = snapshot.suggestions.find(
      (item) => item.id === suggestionId,
    );
    if (!snapshot.encounterId || !suggestion) {
      return;
    }

    const draftState = getDraftState(overrideState, suggestionId);
    if (action !== "accept" && !draftState.reason.trim()) {
      setOverrideState((current) => ({
        ...current,
        [suggestionId]: {
          ...getDraftState(current, suggestionId),
          status: "error",
          message: "Alasan override diperlukan untuk modify atau reject.",
        },
      }));
      return;
    }

    if (action === "modify" && !draftState.finalIcd.trim()) {
      setOverrideState((current) => ({
        ...current,
        [suggestionId]: {
          ...getDraftState(current, suggestionId),
          status: "error",
          message: "Masukkan ICD-10 final sebelum menyimpan override.",
        },
      }));
      return;
    }

    setOverrideState((current) => ({
      ...current,
      [suggestionId]: {
        ...getDraftState(current, suggestionId),
        status: "submitting",
        message: "Merekam override...",
      },
    }));

    try {
      const response = await fetch("/api/dashboard/intelligence/override", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          encounterId: snapshot.encounterId,
          action,
          selectedIcd: suggestion.primaryDiagnosis.icd10Code,
          finalIcd:
            action === "accept"
              ? suggestion.primaryDiagnosis.icd10Code
              : draftState.finalIcd.trim() || undefined,
          selectedConfidence: suggestion.confidence,
          overrideReason:
            action === "accept"
              ? draftState.reason.trim() ||
                "Clinician accepted guarded suggestion"
              : draftState.reason.trim(),
          metadata: {
            source: "dashboard-intelligence",
            requestId: snapshot.requestId,
            engineVersion: snapshot.engineVersion,
          },
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        throw new Error(
          body?.error?.message ?? "Gagal merekam override intelligence.",
        );
      }

      setOverrideState((current) => ({
        ...current,
        [suggestionId]: {
          ...getDraftState(current, suggestionId),
          status: "success",
          message: "Override berhasil direkam.",
        },
      }));
    } catch (error) {
      setOverrideState((current) => ({
        ...current,
        [suggestionId]: {
          ...getDraftState(current, suggestionId),
          status: "error",
          message:
            error instanceof Error ? error.message : "Gagal merekam override.",
        },
      }));
    }
  }

  return (
    <AIInsightsPanelContent
      snapshot={snapshot}
      overrideState={overrideState}
      onDraftChange={updateDraft}
      onSubmitOverride={submitOverride}
    />
  );
}
