import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireApiUser,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user });
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(7).optional(),
  whatsappNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  availabilityStatus: z.enum(["AVAILABLE", "BUSY", "OFF_DUTY", "ON_LEAVE"]).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;
  const currentUser = auth.user;

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid profile update data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let passwordHashUpdate: string | undefined;

    if (data.newPassword) {
      if (!data.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password." },
          { status: 400 }
        );
      }
      const fullUser = await prisma.user.findUnique({ where: { id: currentUser.id } });
      if (!fullUser || !(await verifyPassword(data.currentPassword, fullUser.passwordHash))) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 }
        );
      }
      passwordHashUpdate = await hashPassword(data.newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.whatsappNumber !== undefined ? { whatsappNumber: data.whatsappNumber } : {}),
        ...(passwordHashUpdate ? { passwordHash: passwordHashUpdate } : {}),
        ...(currentUser.role === "CUSTOMER" &&
        (data.address !== undefined ||
          data.city !== undefined ||
          data.state !== undefined ||
          data.postalCode !== undefined)
          ? {
              customerProfile: {
                upsert: {
                  create: {
                    address: data.address || null,
                    city: data.city || null,
                    state: data.state || null,
                    postalCode: data.postalCode || null,
                  },
                  update: {
                    ...(data.address !== undefined ? { address: data.address } : {}),
                    ...(data.city !== undefined ? { city: data.city } : {}),
                    ...(data.state !== undefined ? { state: data.state } : {}),
                    ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
                  },
                },
              },
            }
          : {}),
        ...(currentUser.role === "TECHNICIAN" && data.availabilityStatus
          ? {
              technicianProfile: {
                update: {
                  availabilityStatus: data.availabilityStatus,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        whatsappNumber: true,
        isActive: true,
        customerProfile: true,
        technicianProfile: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

