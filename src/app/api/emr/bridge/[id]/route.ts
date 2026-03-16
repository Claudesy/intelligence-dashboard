// Masterplan and masterpiece by Claudesy.
import { NextResponse } from "next/server";

import { isCrewAuthorizedRequest } from "@/lib/server/crew-access-auth";
import {
  getBridgeEntry,
  claimBridgeEntry,
  updateBridgeEntryStatus,
} from "@/lib/emr/bridge-queue";
import { emitEMRProgress } from "@/lib/emr/socket-bridge";
import type { RMETransferResult } from "@/lib/emr/types";

export const runtime = "nodejs";

/**
 * GET /api/emr/bridge/[id] — Get full entry detail (including payload)
 * Used by Assist after claiming an entry to get the full transfer payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId =
    request.headers.get("x-correlation-id") || "no-correlation";

  if (!isCrewAuthorizedRequest(request)) {
    console.warn(
      `[Bridge] GET /api/emr/bridge/[id] — 401 — correlationId: ${correlationId}`,
    );
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const entry = getBridgeEntry(id);
  if (!entry) {
    return NextResponse.json(
      { ok: false, error: "Entry tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, entry });
}

/**
 * PATCH /api/emr/bridge/[id] — Update entry status
 * Used by Assist to:
 *   1. Claim an entry: { action: "claim", claimedBy: "assist-v1" }
 *   2. Mark processing: { action: "processing" }
 *   3. Report completion: { action: "complete", result: RMETransferResult }
 *   4. Report failure: { action: "fail", error: "reason" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId =
    request.headers.get("x-correlation-id") || "no-correlation";

  if (!isCrewAuthorizedRequest(request)) {
    console.warn(
      `[Bridge] PATCH /api/emr/bridge/[id] — 401 — correlationId: ${correlationId}`,
    );
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      action: "claim" | "processing" | "complete" | "fail";
      claimedBy?: string;
      result?: RMETransferResult;
      error?: string;
    };

    console.log(
      `[Bridge] PATCH /api/emr/bridge/${id} action:${body.action} — correlationId: ${correlationId}`,
    );

    if (!body.action) {
      return NextResponse.json(
        { ok: false, error: "action wajib diisi." },
        { status: 400 },
      );
    }

    let entry;

    switch (body.action) {
      case "claim": {
        entry = claimBridgeEntry(id, body.claimedBy || "assist");
        if (!entry) {
          return NextResponse.json(
            { ok: false, error: "Entry tidak tersedia untuk diklaim." },
            { status: 409 },
          );
        }
        emitEMRProgress({
          transferId: id,
          step: "init",
          status: "running",
          message: "Diklaim oleh Assist — menunggu auto-fill",
          timestamp: entry.claimedAt!,
        });
        break;
      }

      case "processing": {
        entry = updateBridgeEntryStatus(id, "processing");
        if (!entry) {
          return NextResponse.json(
            { ok: false, error: "Entry tidak ditemukan." },
            { status: 404 },
          );
        }
        emitEMRProgress({
          transferId: id,
          step: "anamnesa",
          status: "running",
          message: "Assist sedang mengisi ePuskesmas",
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case "complete": {
        entry = updateBridgeEntryStatus(id, "completed", body.result);
        if (!entry) {
          return NextResponse.json(
            { ok: false, error: "Entry tidak ditemukan." },
            { status: 404 },
          );
        }
        emitEMRProgress({
          transferId: id,
          step: "done",
          status: "success",
          message: `Transfer selesai — ${body.result?.state || "completed"}`,
          timestamp: entry.completedAt!,
        });
        break;
      }

      case "fail": {
        entry = updateBridgeEntryStatus(id, "failed", body.result, body.error);
        if (!entry) {
          return NextResponse.json(
            { ok: false, error: "Entry tidak ditemukan." },
            { status: 404 },
          );
        }
        emitEMRProgress({
          transferId: id,
          step: "done",
          status: "failed",
          message: `Transfer gagal: ${body.error || "unknown"}`,
          timestamp: entry.completedAt!,
        });
        break;
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Action tidak dikenal: ${body.action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      ok: true,
      entry: {
        id: entry.id,
        status: entry.status,
        claimedAt: entry.claimedAt,
        completedAt: entry.completedAt,
      },
    });
  } catch (error) {
    console.error("[Bridge] PATCH error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memperbarui entry." },
      { status: 500 },
    );
  }
}
