import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";

const updateServiceSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().min(10).optional(),
  price: z.coerce.number().positive().optional(),
  durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
  checklistSummary: z.array(z.string().trim().min(1)).min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = updateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.price !== undefined ? { price: d.price } : {}),
        ...(d.durationMinutes !== undefined ? { durationMinutes: d.durationMinutes } : {}),
        ...(d.checklistSummary !== undefined
          ? { checklistSummary: JSON.stringify(d.checklistSummary) }
          : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
        ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      },
    });

    return NextResponse.json({ service });
  } catch (err) {
    console.error("Update service error:", err);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await context.params;
  const bookingCount = await prisma.booking.count({ where: { serviceId: id } });
  if (bookingCount > 0) {
    const service = await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({
      service,
      message: "Service has existing bookings, so it was deactivated instead of deleted.",
    });
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}

