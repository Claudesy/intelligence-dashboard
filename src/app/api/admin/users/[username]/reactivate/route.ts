// Masterplan and masterpiece by Claudesy.
import { NextResponse } from "next/server";
import {
  getCrewSessionFromRequest,
  reactivateCrewAccessUser,
} from "@/lib/server/crew-access-auth";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set([
  "CEO",
  "ADMINISTRATOR",
  "CHIEF_EXECUTIVE_OFFICER",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = getCrewSessionFromRequest(request);
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json(
      { ok: false, error: "Akses ditolak." },
      { status: 403 },
    );
  }

  try {
    const { username } = await params;
    await reactivateCrewAccessUser(username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Gagal mengaktifkan user.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
