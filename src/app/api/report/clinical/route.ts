// Claudesy's vision, brought to life.
import "server-only";

import { NextResponse } from "next/server";

import { isCrewAuthorizedRequest } from "@/lib/server/crew-access-auth";
import {
  deleteClinicalReport,
  listClinicalReports,
  saveClinicalReport,
} from "@/lib/report/clinical-report-store";
import type { ClinicalReportDraftInput } from "@/lib/report/clinical-report";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const dokterFilter = url.searchParams.get("dokter");
    const limitParam = url.searchParams.get("limit");
    const parsedLimit = limitParam
      ? Math.max(1, parseInt(limitParam, 10))
      : null;

    const { reports, nextNumber } = await listClinicalReports({
      dokter: dokterFilter,
      limit: Number.isFinite(parsedLimit ?? NaN) ? parsedLimit : null,
    });

    return NextResponse.json({ ok: true, reports, nextNumber });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as ClinicalReportDraftInput;
    const report = await saveClinicalReport(body);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing id parameter" },
        { status: 400 },
      );
    }
    const deleted = await deleteClinicalReport(id);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "Report tidak ditemukan" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
