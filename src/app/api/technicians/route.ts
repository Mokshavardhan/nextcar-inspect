import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const technicians = await prisma.user.findMany({
    where: { role: "TECHNICIAN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      isActive: true,
      createdAt: true,
      technicianProfile: true,
      assignmentsReceived: {
        where: { isActive: true },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              scheduledDate: true,
              timeSlotLabel: true,
              city: true,
              vehicle: {
                select: {
                  manufacturer: true,
                  model: true,
                  manufacturingYear: true,
                  registrationNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const enriched = technicians.map((t) => {
    const activeAssignments = t.assignmentsReceived.filter(
      (a) =>
        !["COMPLETED", "CANCELLED", "REJECTED", "REPORT_DELIVERED"].includes(a.booking.status)
    );
    const completedAssignments = t.assignmentsReceived.filter((a) =>
      ["APPROVED", "REPORT_DELIVERED", "COMPLETED"].includes(a.booking.status)
    );

    return {
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      whatsappNumber: t.whatsappNumber,
      isActive: t.isActive,
      createdAt: t.createdAt,
      technicianProfile: t.technicianProfile,
      activeWorkloadCount: activeAssignments.length,
      completedCount: completedAssignments.length,
      totalAssignedCount: t.assignmentsReceived.length,
      activeBookings: activeAssignments.map((a) => a.booking),
      completedBookings: completedAssignments.map((a) => a.booking),
    };
  });

  return NextResponse.json({ technicians: enriched });
}

const createTechnicianSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6),
  phone: z.string().trim().min(7),
  whatsappNumber: z.string().trim().optional(),
  employeeCode: z.string().trim().min(3).toUpperCase(),
  specialties: z.string().trim().min(2),
  serviceCity: z.string().trim().min(2),
  availabilityStatus: z
    .enum(["AVAILABLE", "BUSY", "OFF_DUTY", "ON_LEAVE"])
    .default("AVAILABLE"),
  bio: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = createTechnicianSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid technician fields" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const [existingEmail, existingCode] = await Promise.all([
      prisma.user.findUnique({ where: { email: d.email } }),
      prisma.technicianProfile.findUnique({ where: { employeeCode: d.employeeCode } }),
    ]);

    if (existingEmail) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }
    if (existingCode) {
      return NextResponse.json(
        { error: "Employee code is already in use." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(d.password);
    const technician = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        passwordHash,
        role: "TECHNICIAN",
        phone: d.phone,
        whatsappNumber: d.whatsappNumber || d.phone,
        isActive: true,
        technicianProfile: {
          create: {
            employeeCode: d.employeeCode,
            specialties: d.specialties,
            serviceCity: d.serviceCity,
            availabilityStatus: d.availabilityStatus,
            bio: d.bio || null,
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

    return NextResponse.json({ technician }, { status: 201 });
  } catch (err) {
    console.error("Create technician error:", err);
    return NextResponse.json({ error: "Failed to add technician" }, { status: 500 });
  }
}

