// POST /api/consult/transfer-to-emr — buat bridge entry dari accepted consult (Assist bisa claim & isi ePuskesmas).
import { NextRequest, NextResponse } from "next/server";

import {
  appendClinicalCaseAuditEvent,
  CLINICAL_CASE_AUDIT_EVENTS,
} from "@/lib/audit/clinical-case-audit";
import { createBridgeEntry } from "@/lib/emr/bridge-queue";
import { getCrewSessionFromRequest } from "@/lib/server/crew-access-auth";
import { getAcceptedConsult } from "@/lib/telemedicine/consult-accepted";
import { validateTransferBody } from "@/lib/telemedicine/consult-api-validation";
import { consultToBridgePayload } from "@/lib/telemedicine/consult-to-bridge";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = getCrewSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const validation = validateTransferBody(body);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.error },
        { status: validation.status },
      );
    }
    const { consultId, pelayananId } = validation.data;

    const record = getAcceptedConsult(consultId);
    if (!record) {
      return NextResponse.json(
        { ok: false, error: "Consult tidak ditemukan atau belum di-ambil." },
        { status: 404 },
      );
    }

    const payload = consultToBridgePayload(record.consult);
    const patientName = record.consult.patient?.name;
    const entry = createBridgeEntry(
      session.displayName || session.username,
      pelayananId,
      payload,
      patientName,
    );

    await appendClinicalCaseAuditEvent({
      eventType: CLINICAL_CASE_AUDIT_EVENTS.CONSULT_TRANSFERRED_TO_EMR,
      actorUserId: session.username,
      actorName: session.displayName,
      consultId,
      reportId: null,
      sourceOrigin: "assist-consult",
      payload: {
        bridgeEntryId: entry.id,
        pelayananId,
        patientName: patientName ?? null,
        transferStatus: entry.status,
        createdAt: entry.createdAt,
      },
    });

    return NextResponse.json({
      ok: true,
      entry: {
        id: entry.id,
        status: entry.status,
        createdAt: entry.createdAt,
        pelayananId: entry.pelayananId,
        patientName: entry.patientName,
      },
    });
  } catch (err) {
    console.error("[Consult] transfer-to-emr error:", err);
    return NextResponse.json(
      { ok: false, error: "Gagal membuat transfer ke EMR." },
      { status: 500 },
    );
  }
}
