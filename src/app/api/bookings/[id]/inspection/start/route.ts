import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { logBookingActivity } from "@/lib/workflow";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(["TECHNICIAN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: bookingId } = await context.params;

  const assignment = await prisma.technicianAssignment.findFirst({
    where: { bookingId, technicianId: auth.user.id, isActive: true },
    include: { booking: true },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "You are not assigned to this inspection." },
      { status: 403 }
    );
  }

  const booking = assignment.booking;
  if (
    !["TECHNICIAN_ASSIGNED", "RESCHEDULED", "REVISION_REQUESTED", "INSPECTION_STARTED"].includes(
      booking.status
    )
  ) {
    return NextResponse.json(
      { error: `Cannot start inspection from status ${booking.status}.` },
      { status: 400 }
    );
  }

  const inspection = await prisma.$transaction(async (tx) => {
    const existing = await tx.inspection.findUnique({ where: { bookingId } });
    const insp = existing
      ? await tx.inspection.update({
          where: { id: existing.id },
          data: { isDraft: true, technicianId: auth.user.id },
        })
      : await tx.inspection.create({
          data: {
            bookingId,
            technicianId: auth.user.id,
            isDraft: true,
          },
        });

    if (booking.status !== "INSPECTION_STARTED") {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "INSPECTION_STARTED" },
      });
    }

    return insp;
  });

  if (booking.status !== "INSPECTION_STARTED") {
    await logBookingActivity({
      bookingId,
      actorId: auth.user.id,
      actorRole: "TECHNICIAN",
      action: "INSPECTION_STARTED",
      fromStatus: booking.status,
      toStatus: "INSPECTION_STARTED",
      details: `Technician ${auth.user.name} started vehicle inspection.`,
    });
  }

  return NextResponse.json({ inspection });
}

