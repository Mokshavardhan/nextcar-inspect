import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;

  const categories = await prisma.inspectionCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json({ categories });
}

