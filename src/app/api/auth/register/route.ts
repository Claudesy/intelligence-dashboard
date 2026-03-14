// Masterplan and masterpiece by Claudesy.
import { NextResponse } from "next/server";
import { createCrewAccessRegistration } from "@/lib/server/crew-access-registration";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await createCrewAccessRegistration(payload);

    return NextResponse.json(
      {
        ok: true,
        status: "pending_review",
        message:
          "Pendaftaran diterima. Tim admin akan memverifikasi email, institusi, dan profesi sebelum akses diaktifkan.",
        request: result.request,
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Pendaftaran gagal diproses.",
      },
      { status: 400 },
    );
  }
}
