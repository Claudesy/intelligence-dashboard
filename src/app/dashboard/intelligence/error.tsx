"use client";

type IntelligenceDashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function IntelligenceDashboardError({
  error,
  reset,
}: IntelligenceDashboardErrorProps): React.JSX.Element {
  return (
    <div className="w-full px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-md border border-[var(--line-base)] bg-[var(--bg-card)] px-6 py-6">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--c-critical)]">
            Intelligence Dashboard Error
          </p>
          <h1 className="text-2xl font-medium text-[var(--text-main)]">
            Panel belum bisa dimuat.
          </h1>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Terjadi gangguan saat menyiapkan route intelligence. Tidak ada data
            pasien yang ditampilkan pada state ini. Silakan muat ulang panel
            untuk mencoba kembali.
          </p>
        </div>

        <div className="rounded-md border border-dashed border-[var(--line-base)] px-4 py-3 text-sm text-[var(--text-muted)]">
          Referensi error: {error.digest ?? "temporary-state"}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md border border-[var(--line-base)] px-4 py-2 text-sm font-medium text-[var(--text-main)] transition hover:border-[var(--c-asesmen)] hover:text-[var(--text-main)]"
          >
            Coba lagi
          </button>
        </div>
      </div>
    </div>
  );
}
