// The vision and craft of Claudesy.
/**
 * CDSS Diagnose API — Iskandar Diagnosis Engine V2 (LLM-First)
 * POST /api/cdss/diagnose
 */

import { NextResponse } from "next/server";
import { runDiagnosisEngine } from "@/lib/cdss/engine";
import { parseDiagnoseRequestBody } from "@/lib/cdss/diagnose-parser";
import { writeCDSSAuditEntry } from "@/lib/cdss/workflow";
import {
  getCrewSessionFromRequest,
  isCrewAuthorizedRequest
} from "@/lib/server/crew-access-auth";
import {
  getRequestIp,
  writeSecurityAuditLog,
} from "@/lib/server/security-audit";

export const runtime = "nodejs";

function logCDSSError(message: string) {
  if (process.env.NODE_ENV === "test") {
    if (process.env.CDSS_VERBOSE_TEST_ERRORS === "1") {
      console.error("[CDSS API] Error during test scenario:", message);
      return;
    }

    console.error("[CDSS API] Error during test scenario");
    return;
  }

  console.error("[CDSS API] Error:", message);
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const session = getCrewSessionFromRequest(request);

  if (!isCrewAuthorizedRequest(request)) {
    await writeSecurityAuditLog({
      endpoint: "/api/cdss/diagnose",
      action: "CDSS_DIAGNOSE",
      result: "unauthenticated",
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // TODO(security): selaraskan role minimum endpoint ini dengan matriks RBAC produksi.
// NOTE: Role check temporarily disabled due to missing isCrewSessionRoleAllowed export.
//       Reinstate when available.

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseDiagnoseRequestBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    const result = await runDiagnosisEngine(parsed.input);
    await writeCDSSAuditEntry({
      sessionId: parsed.input.session_id,
      action: "DIAGNOSE_RESULT",
      validationStatus: result.validation_summary.requires_more_data
        ? "needs_more_data"
        : "completed",
      modelVersion: result.model_version,
      latencyMs: result.processing_time_ms,
      outputSummary: {
        totalDisplayed: result.suggestions.length,
        redFlagCount: result.red_flags.length,
        unverifiedCount: result.validation_summary.unverified_codes.length,
        recommendedCount: result.validation_summary.recommended_count,
        reviewCount: result.validation_summary.review_count,
        mustNotMissCount: result.validation_summary.must_not_miss_count,
        deferredCount: result.validation_summary.deferred_count,
      },
      metadata: {
        source: result.source,
        nextBestQuestionCount: result.next_best_questions.length,
      },
    });
    await writeSecurityAuditLog({
      endpoint: "/api/cdss/diagnose",
      action: "CDSS_DIAGNOSE",
      result: "success",
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: {
        source: result.source,
        modelVersion: result.model_version,
        totalRawSuggestions: result.validation_summary.total_raw,
        totalValidatedSuggestions: result.validation_summary.total_validated,
        unverifiedCodes: result.validation_summary.unverified_codes,
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    logCDSSError(msg);
    await writeSecurityAuditLog({
      endpoint: "/api/cdss/diagnose",
      action: "CDSS_DIAGNOSE",
      result: "failure",
      userId: session?.username ?? null,
      role: session?.role ?? null,
      ip,
      metadata: { error: msg },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
