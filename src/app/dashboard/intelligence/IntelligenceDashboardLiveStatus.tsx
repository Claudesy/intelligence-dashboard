// Designed and constructed by Claudesy.
"use client";

import { getIntelligenceEventStatusLabel } from "@/lib/intelligence/socket-payload";

import { useSharedIntelligenceSocket } from "./IntelligenceSocketProvider";

function resolveConnectionLabel(
  isConnected: boolean,
  isReconnecting: boolean,
): string {
  if (isReconnecting) {
    return "Memperbarui...";
  }

  if (isConnected) {
    return "Live";
  }

  return "Placeholder";
}

function resolveSourceLabel(isConnected: boolean): string {
  return isConnected ? "/intelligence namespace" : "Preview statis";
}

export default function IntelligenceDashboardLiveStatus(): React.JSX.Element {
  const socket = useSharedIntelligenceSocket();

  const latestEvent = socket.lastEncounterUpdate ?? socket.lastCriticalAlert;
  const latestEventCopy = latestEvent
    ? `Event terakhir ${latestEvent.encounterId} · ${getIntelligenceEventStatusLabel(
        latestEvent.status,
      )}`
    : "Belum ada event live. Scaffold tetap memakai data aman non-PHI.";

  return (
    <div className="grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-2 lg:min-w-[320px]">
      <div className="rounded-md border border-[var(--line-base)] px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-asesmen)]">
          Status
        </div>
        <div className="mt-2 text-[var(--text-main)]">
          {resolveConnectionLabel(socket.isConnected, socket.isReconnecting)}
        </div>
      </div>
      <div className="rounded-md border border-[var(--line-base)] px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-asesmen)]">
          Data Source
        </div>
        <div className="mt-2 text-[var(--text-main)]">
          {resolveSourceLabel(socket.isConnected)}
        </div>
      </div>
      <div className="rounded-md border border-dashed border-[var(--line-base)] px-4 py-3 sm:col-span-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-asesmen)]">
          Live Preview
        </div>
        <div className="mt-2 text-[var(--text-main)]">{latestEventCopy}</div>
      </div>
    </div>
  );
}
