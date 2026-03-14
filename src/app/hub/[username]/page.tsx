// Designed and constructed by Claudesy.
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  resolveCrewRankBadgeSrc,
  resolveCrewSentraTitle,
} from "@/lib/crew-profile";

interface RosterMemberDetail {
  username: string;
  displayName: string;
  email: string;
  institution: string;
  profession: string;
  role: string;
  profile: {
    fullName: string;
    birthPlace: string;
    birthDate: string;
    gender: string;
    domicile: string;
    bloodType: string;
    degrees: string[];
    jobTitles: string[];
    employeeId: string;
    strNumber: string;
    sipNumber: string;
    serviceAreas: string[];
    serviceAreaOther: string;
    institutionAdditional: string;
    avatarUrl: string;
    whatsappNumber: string;
    githubUrl: string;
    linkedinUrl: string;
    gravatarUrl: string;
    blogUrl: string;
  } | null;
}

function formatRole(role: string): string {
  switch (role) {
    case "CEO":
      return "Chief Executive Officer";
    case "ADMINISTRATOR":
      return "Administrator";
    case "DOKTER":
      return "Dokter";
    case "PERAWAT":
      return "Perawat";
    case "BIDAN":
      return "Bidan";
    case "APOTEKER":
      return "Apoteker";
    case "AUDITOR":
      return "Auditor";
    default:
      return role;
  }
}

function formatProfessionLabel(profession: string): string {
  return profession || "Belum diatur";
}

function getShiftLabel(profession: string): string {
  return profession === "Dokter" || profession === "Dokter Gigi"
    ? "07:00 - 14:00 WIB"
    : "08:00 - 15:00 WIB";
}

function formatBirthDate(value: string): string {
  if (!value) return "Belum diisi";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Belum diisi";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function joinValue(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "Belum diisi";
}

function normalizeExternalHref(value: string): string {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

type DetailProfileLink = {
  key: "githubUrl" | "linkedinUrl" | "gravatarUrl" | "blogUrl";
  label: string;
  href: string;
  iconSrc: string;
  color: string;
};

export default function HubProfileDetailPage() {
  const params = useParams<{ username: string }>();
  const username = Array.isArray(params?.username)
    ? params.username[0]
    : (params?.username ?? "");
  const [member, setMember] = useState<RosterMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) {
      setLoading(false);
      setError("Username crew tidak valid.");
      return;
    }

    const controller = new AbortController();

    async function loadMember() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(
          `/api/hub/roster/${encodeURIComponent(username)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          member?: RosterMemberDetail;
        } | null;

        if (!response.ok || !payload?.ok || !payload.member) {
          setMember(null);
          setError(payload?.error || "Profile crew belum bisa dimuat.");
          return;
        }

        setMember(payload.member);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setMember(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Terjadi gangguan saat memuat profile.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMember();
    return () => controller.abort();
  }, [username]);

  const fullName =
    member?.profile?.fullName || member?.displayName || username || "Crew";
  const displayTitle = member?.profile?.degrees?.length
    ? `${member.profile.degrees.join(" ")} ${fullName}`
    : fullName;
  const jobTitle = resolveCrewSentraTitle(
    member?.profile?.jobTitles ?? [],
    member?.role,
  );
  const professionLabel = formatProfessionLabel(member?.profession || "");
  const accessRoleLabel = formatRole(member?.role || "");
  const shiftLabel = getShiftLabel(member?.profession || "");
  const avatarUrl = member?.profile?.avatarUrl || "/avatar.png";
  const rankBadgeSrc = resolveCrewRankBadgeSrc(
    member?.role || "",
    member?.profile?.jobTitles ?? [],
  );
  const serviceAreas = member?.profile?.serviceAreas ?? [];
  const serviceAreaLabel =
    serviceAreas.length > 0
      ? [
          ...serviceAreas,
          ...(member?.profile?.serviceAreaOther
            ? [member.profile.serviceAreaOther]
            : []),
        ].join(", ")
      : "Belum diisi";
  const identityCards = [
    { label: "Jabatan Sentra", value: jobTitle },
    { label: "Profesi", value: professionLabel },
    { label: "Role Sentra", value: accessRoleLabel },
    { label: "Jam Aktif", value: shiftLabel },
  ];
  const detailCards = [
    {
      label: "TTL",
      value:
        member?.profile?.birthPlace && member?.profile?.birthDate
          ? `${member.profile.birthPlace}, ${formatBirthDate(member.profile.birthDate)}`
          : "Belum diisi",
    },
    { label: "Domisili", value: member?.profile?.domicile || "Belum diisi" },
    {
      label: "Golongan Darah",
      value: member?.profile?.bloodType || "Belum diisi",
    },
    { label: "Area Layanan", value: serviceAreaLabel },
    { label: "Institusi", value: member?.institution || "Belum diisi" },
    {
      label: "Tambahan",
      value: member?.profile?.institutionAdditional || "Belum diisi",
    },
  ];
  const credentialChips = [
    member?.profile?.employeeId ? "NIP tersedia" : "",
    member?.profile?.strNumber ? "STR tersimpan" : "",
    member?.profile?.sipNumber ? "SIP tersimpan" : "",
  ].filter(Boolean);
  const profileLinks = [
    {
      key: "githubUrl",
      label: "GitHub",
      href: normalizeExternalHref(member?.profile?.githubUrl || ""),
      iconSrc: "/social/github.svg",
      color: "#d6d0c4",
    },
    {
      key: "linkedinUrl",
      label: "LinkedIn",
      href: normalizeExternalHref(member?.profile?.linkedinUrl || ""),
      iconSrc: "/social/linkedin.svg",
      color: "#78b6ff",
    },
    {
      key: "gravatarUrl",
      label: "Gravatar",
      href: normalizeExternalHref(member?.profile?.gravatarUrl || ""),
      iconSrc: "/social/gravatar.svg",
      color: "#f0b264",
    },
    {
      key: "blogUrl",
      label: "Blog",
      href: normalizeExternalHref(member?.profile?.blogUrl || ""),
      iconSrc: "/social/blog.svg",
      color: "#a5ddb1",
    },
  ] satisfies DetailProfileLink[];
  const visibleProfileLinks = profileLinks.filter((item) => Boolean(item.href));

  return (
    <div style={{ width: "100%", maxWidth: 1180 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
            }}
          >
            CREW PROFILE
          </p>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 28,
              fontWeight: 600,
              color: "var(--text-main)",
              letterSpacing: "-0.02em",
            }}
          >
            Detail Roster
          </h1>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Link
            href={`/hub/lab/${encodeURIComponent(username)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(240, 178, 100, 0.22)",
              background: "rgba(240, 178, 100, 0.08)",
              color: "#f0b264",
              textDecoration: "none",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Buka Lab Preview
          </Link>
          <Link
            href="/hub"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid var(--line-base)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--text-main)",
              textDecoration: "none",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            ← Kembali ke Hub
          </Link>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            borderRadius: 18,
            border: "1px solid var(--line-base)",
            background:
              "linear-gradient(160deg, var(--bg-nav), var(--bg-card))",
            padding: "24px 22px",
            color: "var(--text-muted)",
          }}
        >
          Memuat detail profile crew...
        </div>
      ) : error ? (
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(231,76,60,0.22)",
            background:
              "linear-gradient(160deg, rgba(80,15,15,0.4), var(--bg-card))",
            padding: "24px 22px",
            color: "var(--text-main)",
          }}
        >
          {error}
        </div>
      ) : (
        <>
          <div
            style={{
              borderRadius: 22,
              border: "1px solid var(--line-base)",
              background:
                "linear-gradient(160deg, var(--bg-nav), var(--bg-card))",
              overflow: "hidden",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                height: 3,
                background:
                  "linear-gradient(90deg, rgba(240,178,100,0.92), rgba(240,178,100,0.12), transparent)",
              }}
            />
            <div
              style={{
                padding: "20px",
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              <div style={{ display: "flex", gap: 16, minWidth: 0 }}>
                <img
                  src={avatarUrl}
                  alt={fullName}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 22,
                    objectFit: "cover",
                    border: "1px solid var(--line-base)",
                    background: "var(--bg-canvas)",
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    minWidth: 0,
                    display: "grid",
                    gap: 10,
                    alignContent: "start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginBottom: 6,
                      }}
                    >
                      @{member?.username}
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: "var(--text-main)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {displayTitle}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {credentialChips.length > 0 ? (
                      credentialChips.map((item) => (
                        <span
                          key={item}
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            padding: "5px 10px",
                            borderRadius: 999,
                            border: "1px solid var(--line-base)",
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          padding: "5px 10px",
                          borderRadius: 999,
                          border: "1px solid var(--line-base)",
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        Credential belum lengkap
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid var(--line-base)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "16px",
                  display: "grid",
                  gap: 10,
                  alignContent: "start",
                }}
              >
                {rankBadgeSrc ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 8,
                      minHeight: 128,
                      paddingBottom: 4,
                    }}
                  >
                    <img
                      src={rankBadgeSrc}
                      alt={`Rank ${member?.role}`}
                      style={{
                        width: "clamp(126px, 58%, 176px)",
                        height: "auto",
                        maxHeight: 126,
                        objectFit: "contain",
                        opacity: 0.99,
                      }}
                    />
                  </div>
                ) : null}
                {identityCards.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "110px minmax(0, 1fr)",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-main)",
                        lineHeight: 1.45,
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {detailCards.map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 16,
                  border: "1px solid var(--line-base)",
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                  padding: "14px 15px",
                  display: "grid",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-main)",
                    lineHeight: 1.5,
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              borderRadius: 16,
              border: "1px solid var(--line-base)",
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
              padding: "16px 18px",
              display: "grid",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Link Resmi
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {visibleProfileLinks.length > 0 ? (
                visibleProfileLinks.map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid var(--line-base)",
                      background: "rgba(255,255,255,0.02)",
                      color: item.color,
                      textDecoration: "none",
                      fontSize: 12,
                      letterSpacing: "0.04em",
                    }}
                  >
                    <img
                      src={item.iconSrc}
                      alt={`${item.label} logo`}
                      style={{
                        width: 15,
                        height: 15,
                        objectFit: "contain",
                        flexShrink: 0,
                      }}
                    />
                    <span>{item.label}</span>
                  </a>
                ))
              ) : (
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    lineHeight: 1.55,
                  }}
                >
                  Link resmi belum ditambahkan.
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: "1px solid var(--line-base)",
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
              padding: "16px 18px",
              display: "grid",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Ringkasan Profile
            </span>
            <span
              style={{
                fontSize: 14,
                color: "var(--text-main)",
                lineHeight: 1.65,
              }}
            >
              {displayTitle} bertugas sebagai {professionLabel.toLowerCase()}{" "}
              dengan role Sentra {accessRoleLabel.toLowerCase()}. Jabatan Sentra
              saat ini {jobTitle.toLowerCase()} dan jam aktif terstruktur pada{" "}
              {shiftLabel}. Email akun tercatat sebagai{" "}
              {member?.email || "belum diisi"}.
            </span>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.55,
              }}
            >
              Gelar: {joinValue(member?.profile?.degrees ?? [])}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
