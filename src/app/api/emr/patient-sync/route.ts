// The vision and craft of Claudesy.
import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import fs from "node:fs";
import path from "node:path";

import { normalizeScrapedVisitHistory } from "@/lib/emr/visit-history";
import { emitTriageData } from "@/lib/emr/socket-bridge";

export const runtime = "nodejs";

const SYNC_DIR = path.join(process.cwd(), "runtime", "patient-sync");

/** Validate automation token from X-Crew-Access-Token header */
function validateToken(req: NextRequest): boolean {
  const token = req.headers.get("X-Crew-Access-Token");
  const expected = process.env.CREW_ACCESS_AUTOMATION_TOKEN;
  if (!expected) return false;
  return token === expected;
}

/**
 * POST /api/emr/patient-sync
 * Receives patient data + visit history from Assist extension (nurse side)
 * and relays it to Dashboard EMR page (doctor side) via Socket.IO.
 */
export async function POST(req: NextRequest) {
  if (!validateToken(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const visitHistory = normalizeScrapedVisitHistory(body.visitHistory);

    if (!body.patient || !body.vitals) {
      return NextResponse.json(
        { ok: false, error: "Missing patient or vitals data" },
        { status: 400 },
      );
    }

    // Ensure sync directory exists
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }

    // Save to file
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const patientName = (body.patient.name || body.patient.nama || "unknown")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 30);
    const filename = `${ts}_${patientName}.json`;

    const entry = {
      id: `sync-${Date.now()}`,
      receivedAt: now.toISOString(),
      source: "assist-extension",
      patient: body.patient,
      vitals: body.vitals,
      narrative: body.narrative || {},
      visitHistory,
      medicalHistory: body.medicalHistory || [],
    };

    fs.writeFileSync(
      path.join(SYNC_DIR, filename),
      JSON.stringify(entry, null, 2),
      "utf-8",
    );

    // Map vitals from Assist format → EMR form format
    const v = body.vitals;
    const td = v.sbp && v.dbp ? `${v.sbp}/${v.dbp}` : "";

    // Emit to EMR page via Socket.IO — same format as emr:triage-receive
    emitTriageData({
      keluhanUtama: body.narrative?.keluhan_utama || "",
      vitals: {
        td,
        nadi: v.hr || "",
        napas: v.rr || "",
        suhu: v.temp || "",
        spo2: v.spo2 || "",
        gcs: "15",
        map: "",
      },
      gulaDarah: v.glucose ? { nilai: v.glucose, tipe: "GDS" } : undefined,
      patientAge: body.patient.age || 0,
      patientGender: body.patient.gender || "L",
      patientName: body.patient.name || body.patient.nama || "",
      visitHistory,
      medicalHistory: body.medicalHistory || [],
    });

    console.log(
      `[PatientSync] Relayed triage payload ${entry.id} with ${visitHistory.length} prior visits.`,
    );

    return NextResponse.json({ ok: true, id: entry.id, filename });
  } catch (err) {
    console.error("[PatientSync] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/emr/patient-sync
 * List all synced patient data files for doctor review.
 */
export async function GET(req: NextRequest) {
  if (!validateToken(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    if (!fs.existsSync(SYNC_DIR)) {
      return NextResponse.json({ ok: true, items: [], count: 0 });
    }

    const files = fs
      .readdirSync(SYNC_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    const items = files.map((f) => {
      const content = JSON.parse(
        fs.readFileSync(path.join(SYNC_DIR, f), "utf-8"),
      );
      return {
        filename: f,
        id: content.id,
        receivedAt: content.receivedAt,
        patientName: content.patient?.name || content.patient?.nama || "N/A",
        vitals: content.vitals,
        visitCount: content.visitHistory?.length || 0,
        medicalHistoryCount: content.medicalHistory?.length || 0,
      };
    });

    return NextResponse.json({ ok: true, items, count: items.length });
  } catch (err) {
    console.error("[PatientSync] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
