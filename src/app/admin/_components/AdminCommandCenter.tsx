// Architected and built by the one and only Claudesy.
"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { io, type Socket } from "socket.io-client";
import styles from "./AdminCommandCenter.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

/* ── Types ── */

export interface AdminSession {
  username: string;
  displayName: string;
  role: string;
  profession: string;
  institution: string;
}

interface KPI {
  totalCrew: number;
  pendingRegistrations: number;
  lb1Runs: number;
  lb1SuccessRuns: number;
  lb1FailedRuns: number;
  lb1TotalVisits: number;
  emrTransfers: number;
  emrSuccess: number;
  emrPartial: number;
  emrFailed: number;
  emrAvgLatencyMs: number;
  serverUptimeSeconds: number;
}

interface ModuleHealth {
  lb1: {
    status: "ok" | "error" | "unknown";
    lastRun: string | null;
    lastStatus: string | null;
  };
  emr: {
    status: "ok" | "warning" | "error" | "unknown";
    lastRun: string | null;
    lastStatus: string | null;
  };
}

interface LB1Entry {
  id: string;
  timestamp: string;
  status: string;
  year: number;
  month: number;
  rawatJalan: number;
  rawatInap: number;
  validRows: number;
  invalidRows: number;
}

interface EMREntry {
  id: string;
  timestamp: string;
  state: string;
  totalLatencyMs: number;
  error: string | null;
}

interface CrewMember {
  username: string;
  displayName: string;
  profession: string;
  role: string;
  avatarUrl: string | null;
}

interface ServerMetrics {
  memoryRssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  uptimeSeconds: number;
  nodeVersion: string;
  platform: string;
  railway: {
    environment: string | null;
    serviceName: string | null;
    deploymentId: string | null;
    publicDomain: string | null;
    region: string | null;
  } | null;
}

interface OverviewResponse {
  ok: boolean;
  kpi: KPI;
  moduleHealth: ModuleHealth;
  serverMetrics: ServerMetrics;
  serverTime: string;
  lb1Recent: LB1Entry[];
  emrRecent: EMREntry[];
  crew: CrewMember[];
  pendingRegistrations: { id: string }[];
}

interface OnlineUser {
  userId: string;
  name: string;
  role: string;
  profession: string;
}

/* ── Helpers ── */

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h lalu`;
  return `${Math.floor(hours / 24)}d lalu`;
}

function formatRole(role: string): string {
  switch (role) {
    case "CEO":
      return "Chief Executive Officer";
    case "ADMINISTRATOR":
      return "Administrator";
    case "DOKTER":
      return "Dokter";
    case "DOKTER_GIGI":
      return "Dokter Gigi";
    case "PERAWAT":
      return "Perawat";
    case "BIDAN":
      return "Bidan";
    case "APOTEKER":
      return "Apoteker";
    default:
      return role;
  }
}

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/* ── Module Health Color Resolver ── */

function healthDotVariant(
  module: "lb1" | "emr" | "voice",
  health: ModuleHealth,
  socketConnected: boolean,
): string {
  if (module === "lb1") {
    if (health.lb1.status === "ok") return styles.statusOk;
    if (health.lb1.status === "error") return styles.statusError;
    return styles.statusUnknown;
  }
  if (module === "emr") {
    if (health.emr.status === "ok") return styles.statusOk;
    if (health.emr.status === "warning") return styles.statusWarning;
    if (health.emr.status === "error") return styles.statusError;
    return styles.statusUnknown;
  }
  // voice
  return socketConnected ? styles.statusOk : styles.statusError;
}

function healthLabel(
  module: "lb1" | "emr" | "voice",
  health: ModuleHealth,
  socketConnected: boolean,
): string {
  if (module === "lb1") {
    if (health.lb1.status === "ok") return "Operational";
    if (health.lb1.status === "error") return "Error";
    return "Unknown";
  }
  if (module === "emr") {
    if (health.emr.status === "ok") return "Operational";
    if (health.emr.status === "warning") return "Warning";
    if (health.emr.status === "error") return "Error";
    return "Unknown";
  }
  return socketConnected ? "Available" : "Unavailable";
}

/* ── Alert Item ── */

interface AlertItem {
  source: "LB1" | "EMR";
  timestamp: string;
  message: string;
}

function computeAlerts(
  lb1Recent: LB1Entry[],
  emrRecent: EMREntry[],
): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const entry of lb1Recent) {
    if (entry.status !== "success") {
      alerts.push({
        source: "LB1",
        timestamp: entry.timestamp,
        message: `Run ${MONTH_NAMES[entry.month] || entry.month} ${entry.year} gagal (status: ${entry.status})`,
      });
    }
  }

  for (const entry of emrRecent) {
    if (entry.state === "failed" || entry.state === "cancelled") {
      alerts.push({
        source: "EMR",
        timestamp: entry.timestamp,
        message: entry.error || `Transfer gagal (state: ${entry.state})`,
      });
    }
  }

  alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return alerts;
}

/* ── Component ── */

interface MetricSnapshot {
  time: string;
  heapMb: number;
  rssMb: number;
}

export default function AdminCommandCenter({
  session,
}: {
  session: AdminSession | null;
}) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const [metricHistory, setMetricHistory] = useState<MetricSnapshot[]>([]);

  /* ── Fetch overview data ── */

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/overview", { cache: "no-store" });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(err?.error || "Akses ditolak.");
          return;
        }
        const body = (await res.json()) as OverviewResponse;
        if (body.ok) {
          setData(body);
          if (body.serverMetrics) {
            const now = new Date();
            setMetricHistory([
              {
                time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
                heapMb: body.serverMetrics.heapUsedMb,
                rssMb: body.serverMetrics.memoryRssMb,
              },
            ]);
          }
        } else {
          setError("Data tidak tersedia.");
        }
      } catch {
        setError("Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, []);

  /* ── Poll server metrics every 30s ── */

  const hasInitialData = useRef(false);

  useEffect(() => {
    if (data && !hasInitialData.current) hasInitialData.current = true;
  }, [data]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!hasInitialData.current) return;
      try {
        const res = await fetch("/api/admin/overview", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as OverviewResponse;
        if (!body.ok || !body.serverMetrics) return;
        setData(body);
        const now = new Date();
        setMetricHistory((prev) => {
          const next = [
            ...prev,
            {
              time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
              heapMb: body.serverMetrics.heapUsedMb,
              rssMb: body.serverMetrics.memoryRssMb,
            },
          ];
          return next.length > 30 ? next.slice(-30) : next;
        });
      } catch {
        /* silent */
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  /* ── Socket.IO ── */

  useEffect(() => {
    if (!session) return;

    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("user:join", {
        userId: session.username,
        name: session.displayName,
        role: session.role,
        profession: session.profession,
        institution: session.institution,
      });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("users:online", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session]);

  /* ── Loading / Error states ── */

  if (loading) {
    return (
      <div className={`${styles.statusMessage} ${styles.loadingMessage}`}>
        LOADING COMMAND CENTER...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`${styles.statusMessage} ${styles.errorMessage}`}>
        {error || "Data tidak tersedia."}
      </div>
    );
  }

  /* ── Derived Data ── */

  const {
    kpi,
    moduleHealth,
    serverMetrics,
    serverTime,
    lb1Recent,
    emrRecent,
    pendingRegistrations,
  } = data;
  const onlineCount = onlineUsers.length;
  const pendingCount = pendingRegistrations?.length ?? 0;
  const alerts = computeAlerts(lb1Recent, emrRecent);

  /* ── Chart 1: Aktivitas Dashboard (LB1 kunjungan per periode) ── */

  const lb1SuccessEntries = lb1Recent
    .filter((r) => r.status === "success")
    .reverse();
  const activityLabels = lb1SuccessEntries.map(
    (r) => `${MONTH_NAMES[r.month] || r.month} ${r.year}`,
  );

  const activityChartData = {
    labels: activityLabels,
    datasets: [
      {
        label: "Rawat Jalan",
        data: lb1SuccessEntries.map((r) => r.rawatJalan),
        borderColor: "#E67E22",
        backgroundColor: "rgba(230,126,34,0.08)",
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#E67E22",
        fill: true,
      },
      {
        label: "Rawat Inap",
        data: lb1SuccessEntries.map((r) => r.rawatInap),
        borderColor: "#A0A0A0",
        backgroundColor: "rgba(160,160,160,0.04)",
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#A0A0A0",
        fill: true,
      },
    ],
  };

  const activityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: "#A0A0A0", font: { size: 10 } },
      },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: {
        ticks: { color: "#777", font: { size: 10 } },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#777", font: { size: 10 } },
        grid: { color: "rgba(255,255,255,0.04)" },
        beginAtZero: true,
      },
    },
  };

  /* ── Chart 2: Performa Server (real-time memory line chart) ── */

  const serverChartData = {
    labels: metricHistory.map((s) => s.time),
    datasets: [
      {
        label: "Heap (MB)",
        data: metricHistory.map((s) => s.heapMb),
        borderColor: "#E67E22",
        backgroundColor: "rgba(230,126,34,0.08)",
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#E67E22",
        fill: true,
      },
      {
        label: "RSS (MB)",
        data: metricHistory.map((s) => s.rssMb),
        borderColor: "#A0A0A0",
        backgroundColor: "rgba(160,160,160,0.04)",
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#A0A0A0",
        fill: true,
      },
    ],
  };

  const serverChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: {
        display: true,
        labels: { color: "#A0A0A0", font: { size: 10 } },
      },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: {
        ticks: { color: "#777", font: { size: 9 }, maxTicksLimit: 10 },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#777", font: { size: 10 } },
        grid: { color: "rgba(255,255,255,0.04)" },
        beginAtZero: false,
      },
    },
  };

  const isRailway = !!serverMetrics?.railway;

  /* ── Server Time Display ── */

  const serverDate = new Date(serverTime);
  const serverDateStr = serverDate.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const serverTimeStr = serverDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  /* ── Module Health Entries ── */

  const modules: { key: "lb1" | "emr" | "voice"; label: string }[] = [
    { key: "lb1", label: "LB1" },
    { key: "emr", label: "EMR" },
    { key: "voice", label: "Voice" },
  ];

  /* ── Render ── */

  return (
    <div className={styles.root}>
      {/* ── Server Info + Module Health Row ── */}
      <div className={`${styles.surfaceCard} ${styles.topGrid}`}>
        {/* Server Time */}
        <div className={styles.timeCard}>
          <div
            className={`${styles.sectionEyebrow} ${styles.sectionEyebrowAccent}`}
          >
            Live System Time
          </div>
          <div>
            <div className={styles.timeValue}>{serverDateStr}</div>
            <div className={styles.timeSubValue}>{serverTimeStr}</div>
          </div>
          <div className={styles.uptimeWrap}>
            <div className={styles.uptimeCard}>
              <span className={styles.uptimeLabel}>Uptime</span>
              <span className={styles.uptimeValue}>
                {formatUptime(kpi.serverUptimeSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Module Health Indicators */}
        <div className={styles.moduleColumn}>
          <div className={styles.sectionEyebrow}>Module Health</div>
          <div className={styles.moduleGrid}>
            {modules.map((mod) => (
              <div key={mod.key} className={styles.moduleItem}>
                <div className={styles.moduleHeader}>
                  <div
                    className={`${styles.moduleDot} ${healthDotVariant(mod.key, moduleHealth, socketConnected)}`}
                  />
                  <span className={styles.moduleLabel}>{mod.label}</span>
                </div>
                <span className={styles.moduleStatus}>
                  {healthLabel(mod.key, moduleHealth, socketConnected)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.queueCard}>
          <div className={styles.sectionEyebrow}>Queue Snapshot</div>
          <div className={styles.queueStats}>
            <div className={styles.queueValueRow}>
              <span className={styles.queueNumber}>{pendingCount}</span>
              <span className={styles.queueCaption}>pending registrations</span>
            </div>
            <div className={styles.queueValueRow}>
              <span
                className={
                  socketConnected
                    ? `${styles.queueNumberSmall} ${styles.queueNumberOnline}`
                    : styles.queueNumberSmall
                }
              >
                {onlineCount}
              </span>
              <span className={styles.queueCaption}>crew online realtime</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards Row ── */}
      <div className={styles.kpiGrid}>
        <KPICard
          label="TOTAL CREW"
          value={kpi.totalCrew}
          sub={`${pendingCount > 0 ? `+${pendingCount} pending` : "terdaftar"}`}
          accent
          badge={pendingCount > 0 ? pendingCount : undefined}
        />
        <KPICard
          label="ONLINE NOW"
          value={onlineCount}
          sub={socketConnected ? "realtime" : "disconnected"}
        />
        <KPICard
          label="LB1 RUNS"
          value={kpi.lb1Runs}
          sub={`${kpi.lb1SuccessRuns} sukses`}
        />
        <KPICard
          label="TOTAL KUNJUNGAN"
          value={kpi.lb1TotalVisits}
          sub="dari LB1"
        />
        <KPICard
          label="EMR TRANSFERS"
          value={kpi.emrTransfers}
          sub={`${kpi.emrSuccess} sukses`}
        />
      </div>

      {/* ── Charts: Aktivitas + Server ── */}
      <div className={styles.chartGrid}>
        {/* Chart: Aktivitas Penggunaan */}
        <div className={styles.chartCard}>
          <p className={styles.chartTitle}>AKTIVITAS DASHBOARD</p>
          <div className={styles.chartCanvas}>
            {lb1SuccessEntries.length > 0 ? (
              <Line data={activityChartData} options={activityChartOptions} />
            ) : (
              <EmptyState text="Belum ada data LB1" />
            )}
          </div>
        </div>

        {/* Chart: Performa Server (real-time memory) */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <p className={styles.chartTitleCompact}>PERFORMA SERVER</p>
            <div className={styles.chartMeta}>
              {isRailway && (
                <span className={styles.railwayBadge}>RAILWAY</span>
              )}
              {serverMetrics && (
                <span className={styles.chartMetaText}>
                  {serverMetrics.nodeVersion} · {serverMetrics.platform}
                </span>
              )}
            </div>
          </div>
          <div className={styles.chartCanvas}>
            {metricHistory.length > 0 ? (
              <Line data={serverChartData} options={serverChartOptions} />
            ) : (
              <EmptyState text="Mengumpulkan data..." />
            )}
          </div>
        </div>
      </div>

      {/* ── Active Users + Alerts Row ── */}
      <div className={styles.usersAlertsGrid}>
        {/* Active Users */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <p className={styles.chartTitleCompact}>ACTIVE USERS</p>
            <span className={styles.onlineCountBadge}>
              {onlineCount} online
            </span>
          </div>
          <div className={styles.userList}>
            {onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <div key={user.userId} className={styles.userRow}>
                  <div className={`${styles.userDot} ${styles.statusOk}`} />
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.name}</div>
                    <div className={styles.userMeta}>
                      {user.profession} · {formatRole(user.role)}
                    </div>
                  </div>
                  <span className={styles.liveBadge}>LIVE</span>
                </div>
              ))
            ) : (
              <EmptyState
                text={
                  socketConnected
                    ? "Tidak ada user online"
                    : "Socket disconnected"
                }
              />
            )}
          </div>
        </div>

        {/* Alert Feed */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <p className={styles.chartTitleCompact}>ALERT FEED</p>
            {alerts.length > 0 && (
              <span className={styles.alertCountBadge}>
                {alerts.length} alert{alerts.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className={styles.alertList}>
            {alerts.length > 0 ? (
              alerts.slice(0, 12).map((alert, i) => (
                <div key={`alert-${i}`} className={styles.alertRow}>
                  <span
                    className={
                      alert.source === "LB1"
                        ? `${styles.alertSource} ${styles.alertSourceLb1}`
                        : `${styles.alertSource} ${styles.alertSourceEmr}`
                    }
                  >
                    {alert.source}
                  </span>
                  <div className={styles.alertBody}>
                    <div className={styles.alertMessage}>{alert.message}</div>
                  </div>
                  <span className={styles.alertTime}>
                    {timeAgo(alert.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState text="Tidak ada alert" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KPICard({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
  badge?: number;
}) {
  return (
    <div
      className={
        accent ? `${styles.kpiCard} ${styles.kpiCardAccent}` : styles.kpiCard
      }
    >
      <span
        className={
          accent
            ? `${styles.kpiTopLine} ${styles.kpiTopLineAccent}`
            : styles.kpiTopLine
        }
      />
      {badge != null && badge > 0 && (
        <span className={styles.kpiBadge}>+{badge}</span>
      )}
      <p className={styles.kpiLabel}>{label}</p>
      <p
        className={
          accent
            ? `${styles.kpiValue} ${styles.kpiValueAccent}`
            : styles.kpiValue
        }
      >
        {value.toLocaleString("id-ID")}
      </p>
      <p className={styles.kpiSub}>{sub}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles.emptyState}>{text}</div>;
}
