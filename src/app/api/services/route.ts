import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireApiUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("all") === "true";

  let showAll = false;
  if (includeAll) {
    const user = await getCurrentUser();
    if (user?.role === "ADMIN") showAll = true;
  }

  const services = await prisma.service.findMany({
    where: showAll ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ services });
}

const createServiceSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(10),
  price: z.coerce.number().positive(),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  checklistSummary: z.array(z.string().trim().min(1)).min(1),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = createServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid service details" },
        { status: 400 }
      );
    }

    const baseSlug = parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const existingSlug = await prisma.service.findUnique({ where: { slug: baseSlug } });
    const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const service = await prisma.service.create({
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description,
        price: parsed.data.price,
        durationMinutes: parsed.data.durationMinutes,
        checklistSummary: JSON.stringify(parsed.data.checklistSummary),
        isActive: parsed.data.isActive ?? true,
        sortOrder: parsed.data.sortOrder ?? 10,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    console.error("Create service error:", err);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}

