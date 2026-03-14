// Designed and constructed by Claudesy.
"use client";

import { getCrewSentraLeadershipTitle } from "@/lib/crew-profile";
import { lazy, Suspense, useEffect, useState } from "react";
import type { AdminSession } from "./_components/AdminCommandCenter";
import styles from "./page.module.css";

/* ── Lazy-loaded tab components ── */

const AdminCommandCenter = lazy(
  () => import("./_components/AdminCommandCenter"),
);
const AdminRpaMonitoring = lazy(
  () => import("./_components/AdminRpaMonitoring"),
);
const AdminUserAccess = lazy(() => import("./_components/AdminUserAccess"));
const AdminDevUpdates = lazy(() => import("./_components/AdminDevUpdates"));
const AdminNotam = lazy(() => import("./_components/AdminNotam"));
const AdminInstitutionsTab = lazy(
  () => import("./_components/AdminInstitutionsTab"),
);
const AdminAnalytics = lazy(() => import("./_components/AdminAnalytics"));
const AdminEklaimReadiness = lazy(
  () => import("./_components/AdminEklaimReadiness"),
);
const AdminOperationalSummary = lazy(
  () => import("./_components/AdminOperationalSummary"),
);
const AdminPlaceholder = lazy(() => import("./_components/AdminPlaceholder"));

/* ── Types ── */

type AdminSection =
  | "command-center"
  | "rpa"
  | "user-access"
  | "dev-updates"
  | "notam"
  | "institutions"
  | "integrations"
  | "icdx"
  | "acars"
  | "audit"
  | "analytics"
  | "eklaim"
  | "ops-summary";

type QuickPublishPanel = "dev-updates" | "notam" | null;

interface TabGroup {
  key: string;
  label: string;
  sections: { key: AdminSection; label: string }[];
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TAB_GROUPS: TabGroup[] = [
  {
    key: "operations",
    label: "OPERATIONS",
    sections: [
      { key: "command-center", label: "COMMAND CENTER" },
      { key: "rpa", label: "RPA & LAPORAN" },
    ],
  },
  {
    key: "users",
    label: "USERS",
    sections: [
      { key: "user-access", label: "USER & AKSES" },
      { key: "dev-updates", label: "UPDATE DEV" },
      { key: "notam", label: "NOTAM" },
      { key: "institutions", label: "INSTITUSI" },
    ],
  },
  {
    key: "system",
    label: "SYSTEM",
    sections: [
      { key: "integrations", label: "INTEGRASI" },
      { key: "icdx", label: "ICD-X" },
      { key: "acars", label: "ACARS" },
    ],
  },
  {
    key: "insight",
    label: "INSIGHT",
    sections: [
      { key: "audit", label: "AUDIT" },
      { key: "analytics", label: "ANALITIK" },
      { key: "eklaim", label: "E-KLAIM" },
      { key: "ops-summary", label: "OPS SUMMARY" },
    ],
  },
];

function getGroupForSection(section: AdminSection): string {
  for (const g of TAB_GROUPS) {
    if (g.sections.some((s) => s.key === section)) return g.key;
  }
  return TAB_GROUPS[0].key;
}

/* ── Tab Loading Fallback ── */

function TabLoader() {
  return <div className={styles.tabLoader}>LOADING...</div>;
}

/* ── Component ── */

export default function AdminPage() {
  const [activeSection, setActiveSection] =
    useState<AdminSection>("command-center");
  const [openQuickPublish, setOpenQuickPublish] =
    useState<QuickPublishPanel>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [devQuickTitle, setDevQuickTitle] = useState("");
  const [devQuickBody, setDevQuickBody] = useState("");
  const [devQuickCategory, setDevQuickCategory] = useState<
    "improvement" | "release" | "maintenance"
  >("improvement");
  const [devQuickSubmitting, setDevQuickSubmitting] = useState(false);
  const [notamQuickTitle, setNotamQuickTitle] = useState("");
  const [notamQuickBody, setNotamQuickBody] = useState("");
  const [notamQuickPriority, setNotamQuickPriority] = useState<
    "info" | "warning" | "urgent"
  >("info");
  const [notamQuickSubmitting, setNotamQuickSubmitting] = useState(false);
  const [quickMessage, setQuickMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const activeGroup = getGroupForSection(activeSection);
  const activeGroupObj = TAB_GROUPS.find((g) => g.key === activeGroup)!;
  const sentraPositionLabel =
    getCrewSentraLeadershipTitle(session?.role) ||
    session?.role ||
    "Posisi belum diatur";

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) {
          setError("Akses ditolak.");
          return;
        }
        const data = (await res.json()) as { user?: AdminSession };
        if (data.user) {
          const allowed = new Set([
            "CEO",
            "ADMINISTRATOR",
            "CHIEF_EXECUTIVE_OFFICER",
          ]);
          if (!allowed.has(data.user.role)) {
            setError("Halaman ini hanya untuk Admin.");
            return;
          }
          setSession(data.user);
        } else {
          setError("Session tidak ditemukan.");
        }
      } catch {
        setError("Gagal memuat session.");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  async function handleQuickDevPublish(e: React.FormEvent) {
    e.preventDefault();
    if (!devQuickTitle.trim() || !devQuickBody.trim() || devQuickSubmitting)
      return;

    setDevQuickSubmitting(true);
    setQuickMessage(null);

    try {
      const res = await fetch("/api/admin/dev-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: devQuickTitle.trim(),
          body: devQuickBody.trim(),
          category: devQuickCategory,
          expiresAt: null,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setQuickMessage({
          tone: "error",
          text: data.error || "Gagal menerbitkan update dev.",
        });
        return;
      }

      setDevQuickTitle("");
      setDevQuickBody("");
      setDevQuickCategory("improvement");
      setOpenQuickPublish(null);
      setActiveSection("dev-updates");
      setQuickMessage({
        tone: "success",
        text: data.message || "Update dev berhasil diterbitkan.",
      });
    } catch {
      setQuickMessage({
        tone: "error",
        text: "Tidak dapat terhubung ke server update dev.",
      });
    } finally {
      setDevQuickSubmitting(false);
    }
  }

  async function handleQuickNotamPublish(e: React.FormEvent) {
    e.preventDefault();
    if (
      !notamQuickTitle.trim() ||
      !notamQuickBody.trim() ||
      notamQuickSubmitting
    )
      return;

    setNotamQuickSubmitting(true);
    setQuickMessage(null);

    try {
      const res = await fetch("/api/admin/notam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notamQuickTitle.trim(),
          body: notamQuickBody.trim(),
          priority: notamQuickPriority,
          expiresAt: null,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setQuickMessage({
          tone: "error",
          text: data.error || "Gagal menerbitkan NOTAM.",
        });
        return;
      }

      setNotamQuickTitle("");
      setNotamQuickBody("");
      setNotamQuickPriority("info");
      setOpenQuickPublish(null);
      setActiveSection("notam");
      setQuickMessage({
        tone: "success",
        text: data.message || "NOTAM berhasil diterbitkan.",
      });
    } catch {
      setQuickMessage({
        tone: "error",
        text: "Tidak dapat terhubung ke server NOTAM.",
      });
    } finally {
      setNotamQuickSubmitting(false);
    }
  }

  function toggleQuickPublish(panel: Exclude<QuickPublishPanel, null>) {
    setQuickMessage(null);
    setOpenQuickPublish((current) => (current === panel ? null : panel));
  }

  if (loading) {
    return <div className={styles.pageState}>LOADING ADMIN...</div>;
  }

  if (error) {
    return (
      <div className={cx(styles.pageState, styles.errorState)}>{error}</div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.hero}>
          <p className={styles.heroEyebrow}>Management Console</p>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>Admin Dashboard</h1>
            <p className={styles.heroDescription}>
              Pusat kendali operasional Sentra untuk memantau crew, orkestrasi
              modul, health system, dan sinyal risiko harian tanpa kehilangan
              ritme visual yang tenang.
            </p>
          </div>
        </div>
        <div className={styles.sessionCard}>
          <div className={styles.sessionHeader}>
            <span className={styles.sessionLabel}>Session</span>
            <span className={styles.secureBadge}>Secure Access</span>
          </div>
          <div className={styles.sessionIdentity}>
            <div className={styles.sessionName}>
              {session?.displayName || "Admin"}
            </div>
            <div className={styles.sessionRoleText}>{sentraPositionLabel}</div>
          </div>
          <div className={styles.sessionPills}>
            <span className={styles.sessionPill}>
              {session?.role || "Unknown"}
            </span>
            <span className={cx(styles.sessionPill, styles.sessionPillMuted)}>
              Multi-tab console
            </span>
          </div>
        </div>
      </div>

      {quickMessage && (
        <div
          className={cx(
            styles.messageBanner,
            quickMessage.tone === "success"
              ? styles.messageBannerSuccess
              : styles.messageBannerError,
          )}
        >
          {quickMessage.text}
        </div>
      )}

      {/* ── Sentra Assist Download ── */}
      <div className={styles.downloadCard}>
        <div>
          <div className={styles.downloadEyebrow}>Chrome Extension</div>
          <div className={styles.downloadTitle}>Sentra Assist v1.0.5</div>
          <div className={styles.downloadDescription}>
            Ghost Protocols — Send to Doctor — Pengaturan Bridge — Vital Signs
            Inference
          </div>
        </div>
        <a
          href="https://github.com/Claudesy/ghost-protocols/releases/download/v1.0.5/sentra-assist-1.0.4-chrome.zip"
          download="sentra-assist-1.0.5-chrome.zip"
          className={styles.downloadLink}
        >
          DOWNLOAD .ZIP
        </a>
      </div>

      <div className={styles.quickPublishGrid}>
        <div className={styles.quickPublishCard}>
          <div className={styles.quickPublishHeader}>
            <div>
              <div className={styles.quickPublishEyebrow}>Publikasi Cepat</div>
              <div className={styles.quickPublishTitle}>Update Dev</div>
            </div>
            <button
              type="button"
              onClick={() => toggleQuickPublish("dev-updates")}
              className={styles.quickPublishToggleButton}
            >
              {openQuickPublish === "dev-updates" ? "Tutup Form" : "Buka Form"}
              <span
                className={cx(
                  styles.quickChevron,
                  openQuickPublish === "dev-updates" && styles.quickChevronOpen,
                )}
              >
                ▾
              </span>
            </button>
          </div>
          {openQuickPublish === "dev-updates" && (
            <form
              onSubmit={handleQuickDevPublish}
              className={styles.quickPublishForm}
            >
              <div className={styles.quickField}>
                <label htmlFor="quick-dev-title" className={styles.quickLabel}>
                  Judul
                </label>
                <input
                  id="quick-dev-title"
                  type="text"
                  value={devQuickTitle}
                  onChange={(e) => setDevQuickTitle(e.target.value)}
                  placeholder="Contoh: Patch antrean rawat jalan"
                  maxLength={200}
                  className={styles.quickInput}
                />
              </div>
              <div className={styles.quickField}>
                <label htmlFor="quick-dev-body" className={styles.quickLabel}>
                  Isi update
                </label>
                <textarea
                  id="quick-dev-body"
                  value={devQuickBody}
                  onChange={(e) => setDevQuickBody(e.target.value)}
                  placeholder="Ringkas perubahan, dampak, atau catatan rilis..."
                  rows={3}
                  maxLength={2000}
                  className={cx(styles.quickInput, styles.quickTextarea)}
                />
              </div>
              <div className={styles.quickActionRow}>
                <div className={cx(styles.quickField, styles.quickSelectField)}>
                  <label
                    htmlFor="quick-dev-category"
                    className={styles.quickLabel}
                  >
                    Kategori
                  </label>
                  <select
                    id="quick-dev-category"
                    value={devQuickCategory}
                    onChange={(e) =>
                      setDevQuickCategory(
                        e.target.value as
                          | "improvement"
                          | "release"
                          | "maintenance",
                      )
                    }
                    aria-label="Kategori update dev"
                    title="Kategori update dev"
                    className={cx(styles.quickInput, styles.quickSelect)}
                  >
                    <option value="improvement">Perbaikan</option>
                    <option value="release">Rilis</option>
                    <option value="maintenance">Pemeliharaan</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenQuickPublish(null);
                    setActiveSection("dev-updates");
                  }}
                  className={styles.quickGhostButton}
                >
                  Buka Halaman
                </button>
                <button
                  type="submit"
                  disabled={
                    devQuickSubmitting ||
                    !devQuickTitle.trim() ||
                    !devQuickBody.trim()
                  }
                  className={cx(
                    styles.quickSubmitButton,
                    (devQuickSubmitting ||
                      !devQuickTitle.trim() ||
                      !devQuickBody.trim()) &&
                      styles.quickSubmitButtonDisabled,
                  )}
                >
                  {devQuickSubmitting ? "Menerbitkan..." : "Terbitkan Update"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className={styles.quickPublishCard}>
          <div className={styles.quickPublishHeader}>
            <div>
              <div className={styles.quickPublishEyebrow}>Publikasi Cepat</div>
              <div className={styles.quickPublishTitle}>NOTAM</div>
            </div>
            <button
              type="button"
              onClick={() => toggleQuickPublish("notam")}
              className={styles.quickPublishToggleButton}
            >
              {openQuickPublish === "notam" ? "Tutup Form" : "Buka Form"}
              <span
                className={cx(
                  styles.quickChevron,
                  openQuickPublish === "notam" && styles.quickChevronOpen,
                )}
              >
                ▾
              </span>
            </button>
          </div>
          {openQuickPublish === "notam" && (
            <form
              onSubmit={handleQuickNotamPublish}
              className={styles.quickPublishForm}
            >
              <div className={styles.quickField}>
                <label
                  htmlFor="quick-notam-title"
                  className={styles.quickLabel}
                >
                  Judul
                </label>
                <input
                  id="quick-notam-title"
                  type="text"
                  value={notamQuickTitle}
                  onChange={(e) => setNotamQuickTitle(e.target.value)}
                  placeholder="Contoh: Pemeliharaan jaringan internal"
                  maxLength={200}
                  className={styles.quickInput}
                />
              </div>
              <div className={styles.quickField}>
                <label htmlFor="quick-notam-body" className={styles.quickLabel}>
                  Isi NOTAM
                </label>
                <textarea
                  id="quick-notam-body"
                  value={notamQuickBody}
                  onChange={(e) => setNotamQuickBody(e.target.value)}
                  placeholder="Jelaskan pengumuman operasional secara singkat..."
                  rows={3}
                  maxLength={2000}
                  className={cx(styles.quickInput, styles.quickTextarea)}
                />
              </div>
              <div className={styles.quickActionRow}>
                <div className={cx(styles.quickField, styles.quickSelectField)}>
                  <label
                    htmlFor="quick-notam-priority"
                    className={styles.quickLabel}
                  >
                    Prioritas
                  </label>
                  <select
                    id="quick-notam-priority"
                    value={notamQuickPriority}
                    onChange={(e) =>
                      setNotamQuickPriority(
                        e.target.value as "info" | "warning" | "urgent",
                      )
                    }
                    aria-label="Prioritas NOTAM"
                    title="Prioritas NOTAM"
                    className={cx(styles.quickInput, styles.quickSelect)}
                  >
                    <option value="info">Informasi</option>
                    <option value="warning">Peringatan</option>
                    <option value="urgent">Mendesak</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenQuickPublish(null);
                    setActiveSection("notam");
                  }}
                  className={styles.quickGhostButton}
                >
                  Buka Halaman
                </button>
                <button
                  type="submit"
                  disabled={
                    notamQuickSubmitting ||
                    !notamQuickTitle.trim() ||
                    !notamQuickBody.trim()
                  }
                  className={cx(
                    styles.quickSubmitButton,
                    (notamQuickSubmitting ||
                      !notamQuickTitle.trim() ||
                      !notamQuickBody.trim()) &&
                      styles.quickSubmitButtonDisabled,
                  )}
                >
                  {notamQuickSubmitting ? "Menerbitkan..." : "Terbitkan NOTAM"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Level 1: Group Tabs ── */}
      <div className={styles.groupTabs}>
        {TAB_GROUPS.map((group) => {
          const isActive = activeGroup === group.key;
          return (
            <button
              key={group.key}
              onClick={() => setActiveSection(group.sections[0].key)}
              className={cx(styles.groupTab, isActive && styles.groupTabActive)}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {/* ── Level 2: Section Pills ── */}
      <div className={styles.sectionTabs}>
        {activeGroupObj.sections.map((sec) => {
          const isActive = activeSection === sec.key;
          return (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={cx(
                styles.sectionTab,
                isActive && styles.sectionTabActive,
              )}
            >
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* ── Section Content ── */}
      <div className={styles.sectionContent}>
        <Suspense fallback={<TabLoader />}>
          {activeSection === "command-center" && (
            <AdminCommandCenter session={session} />
          )}
          {activeSection === "rpa" && <AdminRpaMonitoring />}
          {activeSection === "user-access" && <AdminUserAccess />}
          {activeSection === "dev-updates" && <AdminDevUpdates />}
          {activeSection === "notam" && <AdminNotam />}
          {activeSection === "institutions" && <AdminInstitutionsTab />}
          {activeSection === "integrations" && (
            <AdminPlaceholder
              section="Integrasi Eksternal"
              description="Monitoring koneksi ke SATUSEHAT, P-Care BPJS, SIK Dinkes, dan e-Puskesmas."
              prerequisites={[
                "API client untuk SATUSEHAT",
                "API client untuk P-Care BPJS",
                "Konfigurasi endpoint Dinkes",
              ]}
            />
          )}
          {activeSection === "icdx" && (
            <AdminPlaceholder
              section="ICD-X Converter"
              description="Statistik konversi kode ICD-10 (WHO, INA-CBGs, P-Care). Total konversi, success rate, kode paling sering dicari."
              prerequisites={[
                "Logging konversi ICD-X (belum ada)",
                "Database untuk menyimpan query history",
              ]}
            />
          )}
          {activeSection === "acars" && (
            <AdminPlaceholder
              section="ACARS Chat"
              description="Monitoring komunikasi tim: total pesan, channel aktif, file sharing."
              prerequisites={[
                "Message persistence (saat ini hanya in-memory)",
                "Database untuk menyimpan chat history",
              ]}
            />
          )}
          {activeSection === "audit" && (
            <AdminPlaceholder
              section="Audit & Keamanan"
              description="Log aktivitas, percobaan login gagal, akses data pasien, export data."
              prerequisites={[
                "Prisma database aktif (DATABASE_URL)",
                "Login attempt tracking",
              ]}
            />
          )}
          {activeSection === "analytics" && <AdminAnalytics />}
          {activeSection === "eklaim" && <AdminEklaimReadiness />}
          {activeSection === "ops-summary" && <AdminOperationalSummary />}
        </Suspense>
      </div>
    </div>
  );
}
