import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const inquiries = await prisma.contactInquiry.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ inquiries });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "RESOLVED"]),
});

export async function PATCH(request: Request) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const inquiry = await prisma.contactInquiry.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ inquiry });
}

