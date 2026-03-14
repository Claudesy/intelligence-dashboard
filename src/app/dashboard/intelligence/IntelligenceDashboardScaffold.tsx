import dynamic from "next/dynamic";

import type { IntelligenceDashboardAccess } from "@/lib/intelligence/server";

import ClinicalSafetyAlertBanner from "./ClinicalSafetyAlertBanner";
import { IntelligenceSocketProvider } from "./IntelligenceSocketProvider";

// NFR-001: lazy-load heavy panels for code splitting.
// ClinicalSafetyAlertBanner is eagerly loaded — it is critical path for patient safety.

function PanelContentSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-md border border-[var(--line-base)] bg-[var(--bg-card)]"
        />
      ))}
    </div>
  );
}

const PatientQueuePanel = dynamic(() => import("./PatientQueuePanel"), {
  loading: () => <PanelContentSkeleton />,
});

const AIInsightsPanel = dynamic(() => import("./AIInsightsPanel"), {
  loading: () => <PanelContentSkeleton />,
});

const OperationalSummaryPanel = dynamic(
  () => import("./OperationalSummaryPanel"),
  { loading: () => <PanelContentSkeleton /> },
);

function IntelligencePanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--line-base)] px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--c-asesmen)]">
          {subtitle}
        </p>
        <h2 className="mt-2 text-lg font-medium text-[var(--text-main)]">
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

type IntelligenceDashboardScaffoldProps = {
  access: IntelligenceDashboardAccess;
  statusContent: React.ReactNode;
};

function AccessNotice({
  title,
  message,
}: {
  title: string;
  message: string;
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-dashed border-[var(--line-base)] px-4 py-3 text-sm text-[var(--text-muted)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--c-asesmen)]">
        {title}
      </p>
      <p className="mt-2 leading-6">{message}</p>
    </div>
  );
}

export default function IntelligenceDashboardScaffold({
  access,
  statusContent,
}: IntelligenceDashboardScaffoldProps): React.JSX.Element {
  if (!access.hasAnyAccess) {
    return (
      <div className="w-full px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <section className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--c-asesmen)]">
              Dashboard Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-medium tracking-[0.01em] text-[var(--text-main)] sm:text-3xl">
              Akses dashboard dibatasi
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-[15px]">
              Role saat ini belum memiliki izin untuk membuka panel
              intelligence.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <IntelligenceSocketProvider
          enableCdssSuggestions={access.canViewInsights}
        >
          <header className="flex flex-col gap-4 rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--c-asesmen)]">
                Dashboard Intelligence
              </p>
              <h1 className="text-2xl font-medium tracking-[0.01em] text-[var(--text-main)] sm:text-3xl">
                Situational Awareness untuk Shift Klinik
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-[15px]">
                Real-time patient queue, AI insights, e-klaim readiness, dan
                operational summary.
              </p>
            </div>
            {statusContent}
          </header>

          {!access.canViewInsights && (
            <AccessNotice
              title="Clinical Visibility"
              message="AI Insights hanya tersedia untuk role klinis."
            />
          )}

          {!access.canViewMetrics && (
            <AccessNotice
              title="Management Visibility"
              message="Operational Summary hanya tersedia untuk role manajemen."
            />
          )}

          {access.canViewAlerts && <ClinicalSafetyAlertBanner />}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            {access.canViewEncounters && (
              <IntelligencePanel title="Patient Queue" subtitle="FR-001">
                <PatientQueuePanel />
              </IntelligencePanel>
            )}

            <div className="grid gap-6">
              {access.canViewInsights && (
                <IntelligencePanel
                  title="Insights Workspace"
                  subtitle="FR-002 · FR-003 · FR-004"
                >
                  <AIInsightsPanel />
                </IntelligencePanel>
              )}

              {access.canViewMetrics && (
                <IntelligencePanel
                  title="Operational Summary"
                  subtitle="FR-006"
                >
                  <OperationalSummaryPanel />
                </IntelligencePanel>
              )}
            </div>
          </div>
        </IntelligenceSocketProvider>
      </div>
    </div>
  );
}
