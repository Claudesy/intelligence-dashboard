// Designed and constructed by Claudesy.
function LoadingBlock({ className }: { className: string }): React.JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] ${className}`}
    />
  );
}

export default function IntelligenceDashboardLoading(): React.JSX.Element {
  return (
    <div className="w-full px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-5 py-5">
          <div className="space-y-3">
            <LoadingBlock className="h-3 w-32" />
            <LoadingBlock className="h-8 w-full max-w-2xl" />
            <LoadingBlock className="h-4 w-full max-w-3xl" />
          </div>
        </section>

        <LoadingBlock className="h-28 w-full" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-5 py-4">
            <div className="mb-4 space-y-2">
              <LoadingBlock className="h-3 w-20" />
              <LoadingBlock className="h-6 w-48" />
            </div>
            <div className="space-y-3">
              <LoadingBlock className="h-28 w-full" />
              <LoadingBlock className="h-28 w-full" />
              <LoadingBlock className="h-28 w-full" />
            </div>
          </section>

          <div className="grid gap-6">
            <section className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-5 py-4">
              <div className="mb-4 space-y-2">
                <LoadingBlock className="h-3 w-28" />
                <LoadingBlock className="h-6 w-44" />
              </div>
              <div className="space-y-3">
                <LoadingBlock className="h-24 w-full" />
                <LoadingBlock className="h-24 w-full" />
              </div>
            </section>

            <section className="rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-5 py-4">
              <div className="mb-4 space-y-2">
                <LoadingBlock className="h-3 w-24" />
                <LoadingBlock className="h-6 w-52" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LoadingBlock className="h-24 w-full" />
                <LoadingBlock className="h-24 w-full" />
                <LoadingBlock className="h-24 w-full" />
                <LoadingBlock className="h-24 w-full" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
