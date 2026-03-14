// Designed and constructed by Claudesy.
// Sentra Assist — Ghost Protocols Bridge
// GET /api/doctors/online — returns list of doctors currently online
// Called by Assist (Chrome Extension) to populate "Send to Doctor" selector

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isCrewAuthorizedRequest } from "@/lib/server/crew-access-auth";

export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const online = await prisma.doctorStatus.findMany({
      where: { isOnline: true },
      select: { doctorName: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    const doctors = online.map((d) => ({
      id: d.doctorName,
      name: d.doctorName,
      role: "dokter",
    }));

    return NextResponse.json({ ok: true, doctors });
  } catch (err) {
    console.error("[Doctors/Online] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
