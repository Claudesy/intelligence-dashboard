// Architected and built by Claudesy.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  LogOutIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

const NAV_ITEMS: Array<{
  href: string;
  label: React.ReactNode;
  collapsedLabel?: string;
}> = [
  { href: "/admin", label: "Admin" },
  { href: "/", label: "Profil User" },
  { href: "/hub", label: "Sentra HUB" },
  {
    href: "/emr",
    label: (
      <>
        Clinical Mind
        <br />
        Algorithm
      </>
    ),
    collapsedLabel: "C",
  },
  { href: "/acars", label: "Sentra Network" },
  { href: "/voice", label: "Consult Audrey" },
  { href: "/telemedicine", label: "Telemedicine" },
  { href: "/icdx", label: "Smart ICD-10" },
  { href: "/calculator", label: "SenCall" },
  { href: "/report", label: "Report" },
];

const ACCENT = "#E67E22";

function formatSidebarDate(value: Date): string {
  return value.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function AppNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [crewName, setCrewName] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    if (localStorage.getItem("puskesmas:nav-collapsed") === "true")
      setCollapsed(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggle_collapse();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  function toggle_collapse() {
    setCollapsed((p) => {
      localStorage.setItem("puskesmas:nav-collapsed", String(!p));
      return !p;
    });
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            user?: { displayName?: string };
            profile?: { fullName?: string };
          } | null,
        ) => {
          if (alive)
            setCrewName(d?.profile?.fullName || d?.user?.displayName || "");
        },
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.reload();
  }

  const w = collapsed ? 56 : 240;
  const sidebarDate = formatSidebarDate(currentDate);

  return (
    <>
      <nav className="app-nav" style={{ width: w, minWidth: w }}>
        {/* ── Header with Neumorphic Text ── */}
        <div className="nav-header" style={{ border: "none" }}>
          {!collapsed ? (
            <div style={{ padding: "32px 24px" }}>
              {/* Intelligence Dashboard V1 - Neumorphic embossed */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 300,
                  color: "#EDEDED",
                  letterSpacing: "0.1em",
                  textShadow:
                    "3px 3px 6px rgba(0,0,0,0.5), -2px -2px 4px rgba(255,255,255,0.08)",
                }}
              >
                Intelligence
              </div>

              {/* Dashboard V1 - Neumorphic embossed */}
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: "#F5EDE2",
                  fontStyle: "italic",
                  letterSpacing: "0.05em",
                  marginTop: 6,
                  marginBottom: 6,
                  textShadow:
                    "4px 4px 8px rgba(0,0,0,0.5), -2px -2px 4px rgba(255,255,255,0.08)",
                }}
              >
                Dashboard V1
              </div>

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 16,
                  borderTop: `1px solid ${ACCENT}29`,
                }}
              >
                {/* Powered by Sentra - refreshed header accent */}
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#F2E7DA",
                    letterSpacing: "0.08em",
                    lineHeight: 1.2,
                    textTransform: "uppercase",
                    textShadow:
                      "3px 3px 7px rgba(0,0,0,0.46), -1px -1px 2px rgba(255,255,255,0.08)",
                  }}
                >
                  Powered by{" "}
                  <span
                    style={{
                      color: ACCENT,
                      fontStyle: "italic",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Sentra
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#B9ACA0",
                    marginTop: 8,
                    letterSpacing: "0.05em",
                    lineHeight: 1.5,
                    textTransform: "capitalize",
                    textShadow:
                      "2px 2px 4px rgba(0,0,0,0.36), -1px -1px 2px rgba(255,255,255,0.04)",
                  }}
                >
                  {sidebarDate}
                </div>
              </div>

              {/* IP Notice */}
              <div
                style={{
                  fontSize: 11,
                  color: "#555",
                  marginTop: 16,
                  fontStyle: "italic",
                  letterSpacing: "0.03em",
                }}
              >
                Intellectual Property of dr. Ferdi Iskandar
              </div>
            </div>
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 300,
                  color: ACCENT,
                  textShadow:
                    "2px 2px 4px rgba(0,0,0,0.5), -1px -1px 2px rgba(255,255,255,0.1)",
                }}
              >
                I
              </span>
            </div>
          )}
          <button
            className="nav-collapse-btn"
            onClick={toggle_collapse}
            title={collapsed ? "Expand (Ctrl+B)" : "Collapse (Ctrl+B)"}
          >
            {collapsed ? (
              <PanelLeftOpenIcon size={14} />
            ) : (
              <PanelLeftCloseIcon size={14} />
            )}
          </button>
        </div>

        {/* ── Menu — Aether MenuVertical style ── */}
        <div className="nav-menu">
          {NAV_ITEMS.map(({ href, label, collapsedLabel }) => {
            const isActive =
              pathname === href || (href === "/acars" && pathname.startsWith("/acars"));
            const isHovered = hovered === href;
            const lit = isActive || isHovered;

            return (
              <div
                key={href}
                className="nav-menu-row"
                onMouseEnter={() => setHovered(href)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Arrow — slides in from left */}
                <span
                  className="nav-menu-arrow"
                  style={{
                    opacity: lit ? 1 : 0,
                    transform: lit ? "translateX(0)" : "translateX(-100%)",
                    color: ACCENT,
                  }}
                >
                  <ArrowRight size={18} strokeWidth={2.5} />
                </span>

                {/* Label — shifts right & changes color */}
                <Link
                  href={href}
                  className="nav-menu-label"
                  style={{
                    color: lit ? ACCENT : "var(--nav-muted)",
                    transform: lit ? "translateX(0)" : "translateX(-8px)",
                  }}
                >
                  {collapsed ? (typeof label === "string" ? label.slice(0, 1) : collapsedLabel ?? "C") : label}
                </Link>
              </div>
            );
          })}
        </div>

        {/* ── Footer controls ── */}
        <div
          className="nav-controls"
          style={{ padding: collapsed ? "12px 8px" : "12px 16px" }}
        >
          <button
            className="nav-ctrl-btn"
            onClick={toggle}
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            style={{ justifyContent: collapsed ? "center" : "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {theme === "dark" ? (
                <MoonIcon size={13} />
              ) : (
                <SunIcon size={13} />
              )}
              {!collapsed && (
                <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
              )}
            </span>
            {!collapsed && (
              <div className={`theme-toggle-track ${theme}`}>
                <div className="theme-toggle-thumb" />
              </div>
            )}
          </button>

          <button
            className="nav-ctrl-btn nav-ctrl-btn--logout"
            onClick={handleLogout}
            title="Logout"
            style={{ justifyContent: collapsed ? "center" : "flex-start" }}
          >
            <LogOutIcon size={13} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* ── Footer with Crew Info ── */}
        {!collapsed && (
          <div
            style={{
              padding: "20px 24px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              marginTop: "auto",
            }}
          >
            {crewName && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {/* Crew Label */}
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#666",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                    textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  Crew
                </span>

                {/* Crew Name - Neumorphic */}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: ACCENT,
                    letterSpacing: "0.05em",
                    textShadow:
                      "2px 2px 4px rgba(0,0,0,0.5), -1px -1px 2px rgba(255,255,255,0.08)",
                    padding: "8px 0",
                  }}
                >
                  {crewName}
                </span>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div
        aria-hidden
        style={{
          width: w,
          minWidth: w,
          flexShrink: 0,
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </>
  );
}
