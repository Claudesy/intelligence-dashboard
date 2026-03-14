// Designed and constructed by Claudesy.
// Sentra Assist — Ghost Protocols Bridge
// POST /api/consult — receive clinical consult from Assist, route to target doctor
// Called by Assist (Chrome Extension) after perawat selects a doctor

import { NextRequest, NextResponse } from "next/server";
import { isCrewAuthorizedRequest } from "@/lib/server/crew-access-auth";
import { emitAssistConsult } from "@/lib/telemedicine/socket-bridge";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isCrewAuthorizedRequest(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const {
      patient,
      ttv,
      keluhan_utama,
      risk_factors,
      anthropometrics,
      penyakit_kronis,
      target_doctor_id,
      sent_at,
    } = body;

    if (!patient?.name || !keluhan_utama || !target_doctor_id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Field wajib tidak lengkap: patient.name, keluhan_utama, target_doctor_id",
        },
        { status: 400 },
      );
    }

    const consultId = `consult-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    emitAssistConsult({
      consultId,
      targetDoctorId: String(target_doctor_id),
      sentAt: sent_at || new Date().toISOString(),
      patient,
      ttv: ttv || {},
      keluhan_utama: String(keluhan_utama),
      risk_factors: Array.isArray(risk_factors) ? risk_factors : [],
      anthropometrics: anthropometrics || {},
      penyakit_kronis: Array.isArray(penyakit_kronis) ? penyakit_kronis : [],
    });

    console.log(
      `[Consult] Routed to ${target_doctor_id}, consultId: ${consultId}`,
    );

    return NextResponse.json({ ok: true, consultId });
  } catch (err) {
    console.error("[Consult] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
