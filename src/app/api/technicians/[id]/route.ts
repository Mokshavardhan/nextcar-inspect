import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireApiUser } from "@/lib/auth";

const updateTechnicianSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(7).optional(),
  whatsappNumber: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  specialties: z.string().trim().optional(),
  serviceCity: z.string().trim().optional(),
  availabilityStatus: z.enum(["AVAILABLE", "BUSY", "OFF_DUTY", "ON_LEAVE"]).optional(),
  bio: z.string().trim().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  newPassword: z.string().min(6).optional(),
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
    const parsed = updateTechnicianSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const existing = await prisma.user.findFirst({
      where: { id, role: "TECHNICIAN" },
      include: { technicianProfile: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }

    const passwordHash = d.newPassword ? await hashPassword(d.newPassword) : undefined;

    const technician = await prisma.user.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.phone !== undefined ? { phone: d.phone } : {}),
        ...(d.whatsappNumber !== undefined ? { whatsappNumber: d.whatsappNumber } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        technicianProfile: {
          update: {
            ...(d.specialties !== undefined ? { specialties: d.specialties } : {}),
            ...(d.serviceCity !== undefined ? { serviceCity: d.serviceCity } : {}),
            ...(d.availabilityStatus !== undefined
              ? { availabilityStatus: d.availabilityStatus }
              : {}),
            ...(d.bio !== undefined ? { bio: d.bio } : {}),
            ...(d.rating !== undefined ? { rating: d.rating } : {}),
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsappNumber: true,
        isActive: true,
        technicianProfile: true,
      },
    });

    return NextResponse.json({ technician });
  } catch (err) {
    console.error("Update technician error:", err);
    return NextResponse.json({ error: "Failed to update technician" }, { status: 500 });
  }
}

