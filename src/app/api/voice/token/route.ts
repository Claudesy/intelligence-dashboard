// Blueprinted & built by Claudesy.
import { NextResponse } from "next/server";
import {
  getCrewSessionFromRequest,
  isCrewAuthorizedRequest,
} from "@/lib/server/crew-access-auth";
import {
  getRequestIp,
  writeSecurityAuditLog,
} from "@/lib/server/security-audit";

export const runtime = "nodejs";

// Endpoint ini return ephemeral token untuk Gemini Live API
// Browser pakai token ini langsung connect ke Gemini — API key tidak pernah expose ke client
export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const session = getCrewSessionFromRequest(request);

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: "/api/voice/token",
      action: "VOICE_TOKEN_REQUEST",
      result: "unauthenticated",
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // TODO(security): selaraskan role minimum endpoint ini dengan matriks RBAC produksi.

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await writeSecurityAuditLog({
      endpoint: "/api/voice/token",
      action: "VOICE_TOKEN_REQUEST",
      result: "failure",
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { reason: "missing_gemini_api_key" },
    });
    return NextResponse.json(
      { error: "GEMINI_API_KEY belum dikonfigurasi" },
      { status: 500 },
    );
  }

  try {
    const providerUrl =
      process.env.GEMINI_EPHEMERAL_TOKEN_URL?.trim() ||
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateEphemeralToken?key=${apiKey}`;

    const res = await fetch(providerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ttl: "300s", // 5 menit
        newSessionExpireTime: new Date(
          Date.now() + 5 * 60 * 1000,
        ).toISOString(),
      }),
    });

    if (!res.ok) {
      await res.text();
      await writeSecurityAuditLog({
        endpoint: "/api/voice/token",
        action: "VOICE_TOKEN_REQUEST",
        result: "failure",
        userId: session?.username ?? null,
        role: session?.role ?? null,
        ip,
        metadata: {
          status: res.status,
          provider: "gemini",
        },
      });
      return NextResponse.json(
        { error: "Failed to create voice token" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { token?: string };
    if (!data.token) {
      await writeSecurityAuditLog({
        endpoint: "/api/voice/token",
        action: "VOICE_TOKEN_REQUEST",
        result: "failure",
        userId: session?.username ?? null,
        role: session?.role ?? null,
        ip,
        metadata: { provider: "gemini", reason: "missing_token" },
      });
      return NextResponse.json(
        { error: "Voice token tidak tersedia" },
        { status: 502 },
      );
    }

    await writeSecurityAuditLog({
      endpoint: "/api/voice/token",
      action: "VOICE_TOKEN_REQUEST",
      result: "success",
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { provider: "gemini" },
    });
    return NextResponse.json({
      token: data.token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await writeSecurityAuditLog({
      endpoint: "/api/voice/token",
      action: "VOICE_TOKEN_REQUEST",
      result: "failure",
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { error: msg },
    });
    return NextResponse.json(
      { error: "Failed to create voice token" },
      { status: 502 },
    );
  }
}
