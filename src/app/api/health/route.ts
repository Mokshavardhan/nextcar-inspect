import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rawUrl = process.env.DATABASE_URL || "";
  let databaseHost = "NOT_SET";
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      databaseHost = `${parsed.hostname}:${parsed.port || "5432"}`;
    } catch {
      databaseHost = "INVALID_URL_FORMAT";
    }
  }

  try {
    const [servicesCount, usersCount] = await Promise.all([
      prisma.service.count(),
      prisma.user.count(),
    ]);
    return NextResponse.json({
      ok: true,
      hasDatabaseUrl: Boolean(rawUrl),
      databaseHost,
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      servicesCount,
      usersCount,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        hasDatabaseUrl: Boolean(rawUrl),
        databaseHost,
        hasAuthSecret: Boolean(process.env.AUTH_SECRET),
        errorName: err instanceof Error ? err.name : "UnknownError",
        errorMessage: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

