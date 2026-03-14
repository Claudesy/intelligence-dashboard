// Claudesy's vision, brought to life.
import { NextResponse } from "next/server";
import { getCrewSessionFromRequest } from "@/lib/server/crew-access-auth";
import { rejectRegistration } from "@/lib/server/crew-access-registration";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set([
  "CEO",
  "ADMINISTRATOR",
  "CHIEF_EXECUTIVE_OFFICER",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getCrewSessionFromRequest(request);
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json(
      { ok: false, error: "Akses ditolak." },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const result = await rejectRegistration(id, session.username);
    return NextResponse.json({
      ok: true,
      username: result.username,
      message: "Pendaftaran ditolak.",
    });
  } catch (error) {
    console.error("[Admin] Reject registration error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Gagal menolak pendaftaran.",
      },
      { status: 400 },
    );
  }
}
