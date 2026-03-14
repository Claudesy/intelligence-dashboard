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

const NAV_ITEMS = [
  { href: "/admin", label: "Admin" },
  { href: "/", label: "Profil User" },
  { href: "/hub", label: "Sentra HUB" },
  { href: "/emr", label: "EMR Klinis" },
  { href: "/voice", label: "Consult Audrey" },
  { href: "/icdx", label: "ICDX Unification" },
  { href: "/calculator", label: "SenCall" },
  { href: "/telemedicine", label: "Telemedicine" },
  { href: "/report", label: "Report" },
  { href: "/acars", label: "ACARS" },
];

const ACCENT = "#E67E22";

export default function AppNav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [crewName, setCrewName] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

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
  });

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

  return (
    <>
      <nav className="app-nav" style={{ width: w, minWidth: w }}>
        {/* ── Header with Neumorphic Text ── */}
        <div className="nav-header" style={{ border: "none" }}>
          {!collapsed ? (
            <div style={{ padding: "32px 24px" }}>
              {/* Puskesmas - Neumorphic embossed */}
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
                Puskesmas
              </div>

              {/* Intelligence - Neumorphic embossed */}
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
                Intelligence
              </div>

              {/* Dashboard - Neumorphic embossed */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 300,
                  color: ACCENT,
                  letterSpacing: "0.1em",
                  textShadow:
                    "3px 3px 6px rgba(0,0,0,0.5), -2px -2px 4px rgba(255,255,255,0.05)",
                }}
              >
                Dashboard
              </div>

              {/* Powered by Sentra - Neumorphic embossed */}
              <div
                style={{
                  fontSize: 12,
                  color: "#888",
                  marginTop: 20,
                  letterSpacing: "0.15em",
                  fontFamily: "var(--font-mono)",
                  textShadow:
                    "2px 2px 4px rgba(0,0,0,0.5), -1px -1px 2px rgba(255,255,255,0.05)",
                }}
              >
                Powered by Sentra
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
                P
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
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname === href;
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
                  {collapsed ? label.slice(0, 1) : label}
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
