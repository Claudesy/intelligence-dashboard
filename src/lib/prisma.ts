// Blueprinted & built by Claudesy.
import "server-only";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const url = new URL(connectionString);
  if (
    url.searchParams.has("sslmode") &&
    !url.searchParams.get("sslmode")?.includes("verify-full") &&
    !url.searchParams.has("uselibpqcompat")
  ) {
    url.searchParams.set("sslmode", "verify-full");
  }
  const pool = new Pool({ connectionString: url.toString() });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
