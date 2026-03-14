// Architected and built by the one and only Claudesy.
import { NextResponse } from "next/server";

import {
  getCrewSessionFromRequest,
  isCrewAuthorizedRequest,
} from "@/lib/server/crew-access-auth";
import {
  createBridgeEntry,
  listBridgeEntries,
  getBridgeStats,
  type BridgeEntryStatus,
} from "@/lib/emr/bridge-queue";
import { emitEMRProgress } from "@/lib/emr/socket-bridge";
import type { RMETransferPayload } from "@/lib/emr/types";

export const runtime = "nodejs";

/**
 * POST /api/emr/bridge — Create a new transfer request
 * Body: { pelayananId, patientName?, payload: RMETransferPayload }
 */
export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      pelayananId?: string;
      patientName?: string;
      payload?: RMETransferPayload;
    };

    if (!body.pelayananId || !body.payload) {
      return NextResponse.json(
        { ok: false, error: "pelayananId dan payload wajib diisi." },
        { status: 400 },
      );
    }

    if (!body.payload.anamnesa) {
      return NextResponse.json(
        { ok: false, error: "payload.anamnesa wajib diisi." },
        { status: 400 },
      );
    }

    const entry = createBridgeEntry(
      session.username,
      body.pelayananId,
      body.payload,
      body.patientName,
    );

    // Notify connected clients via Socket.IO
    emitEMRProgress({
      transferId: entry.id,
      step: "init",
      status: "running",
      message: `Transfer baru: ${body.patientName || body.pelayananId}`,
      timestamp: entry.createdAt,
    });

    return NextResponse.json({
      ok: true,
      entry: {
        id: entry.id,
        status: entry.status,
        createdAt: entry.createdAt,
        pelayananId: entry.pelayananId,
      },
    });
  } catch (error) {
    console.error("[Bridge] POST error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal membuat transfer request." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/emr/bridge — List queue entries (for Assist polling)
 * Query params:
 *   status=pending (default) | claimed | processing | completed | failed
 *   limit=10 (default)
 *   stats=true (include queue stats)
 */
export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") || "pending";
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
    const includeStats = searchParams.get("stats") === "true";

    const statuses = statusParam.split(",") as BridgeEntryStatus[];
    const entries = listBridgeEntries({ status: statuses, limit });

    // Strip full payload from list view — Assist claims first, then fetches detail
    const items = entries.map((e) => ({
      id: e.id,
      status: e.status,
      createdAt: e.createdAt,
      createdBy: e.createdBy,
      pelayananId: e.pelayananId,
      patientName: e.patientName,
      hasAnamnesa: !!e.payload.anamnesa,
      hasDiagnosa: !!e.payload.diagnosa,
      hasResep: !!e.payload.resep,
    }));

    const response: Record<string, unknown> = {
      ok: true,
      items,
      count: items.length,
    };
    if (includeStats) {
      response.stats = getBridgeStats();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Bridge] GET error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat antrian bridge." },
      { status: 500 },
    );
  }
}
