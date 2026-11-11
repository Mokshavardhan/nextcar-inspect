import { NextResponse } from "next/server";
import { prisma, resolveDatabaseUrl } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rawUrl = resolveDatabaseUrl() || "";
  let databaseHost = "NOT_SET";
  let pgbouncerEnabled = false;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      databaseHost = `${parsed.hostname}:${parsed.port || "5432"}`;
      pgbouncerEnabled = parsed.searchParams.get("pgbouncer") === "true";
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
      pgbouncerEnabled,
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

