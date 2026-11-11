import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { logBookingActivity } from "@/lib/workflow";
import { notifyTechnicianAssigned } from "@/lib/notifications";

const assignSchema = z.object({
  technicianId: z.string().min(1),
  notes: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: bookingId } = await context.params;
  try {
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please select a valid technician." }, { status: 400 });
    }

    const [booking, technician] = await Promise.all([
      prisma.booking.findUnique({ where: { id: bookingId } }),
      prisma.user.findFirst({
        where: { id: parsed.data.technicianId, role: "TECHNICIAN", isActive: true },
        include: { technicianProfile: true },
      }),
    ]);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (!technician) {
      return NextResponse.json(
        { error: "Selected technician is unavailable or inactive." },
        { status: 400 }
      );
    }
    if (["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot assign a technician to a ${booking.status} booking.` },
        { status: 400 }
      );
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      await tx.technicianAssignment.updateMany({
        where: { bookingId, isActive: true },
        data: { isActive: false },
      });

      await tx.technicianAssignment.create({
        data: {
          bookingId,
          technicianId: technician.id,
          assignedById: auth.user.id,
          isActive: true,
          notes: parsed.data.notes || null,
        },
      });

      return tx.booking.update({
        where: { id: bookingId },
        data: { status: "TECHNICIAN_ASSIGNED" },
      });
    });

    await logBookingActivity({
      bookingId,
      actorId: auth.user.id,
      actorRole: "ADMIN",
      action: "TECHNICIAN_ASSIGNED",
      fromStatus: booking.status,
      toStatus: "TECHNICIAN_ASSIGNED",
      details: `Assigned to ${technician.name} (${
        technician.technicianProfile?.employeeCode || "TECH"
      }).${parsed.data.notes ? ` Note: ${parsed.data.notes}` : ""}`,
    });

    await notifyTechnicianAssigned(bookingId, technician.id);

    return NextResponse.json({ booking: updatedBooking });
  } catch (err) {
    console.error("Assign technician error:", err);
    return NextResponse.json({ error: "Failed to assign technician" }, { status: 500 });
  }
}

