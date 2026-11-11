import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { getTodayDateStr } from "@/lib/format";
import { canTransitionStatus, isWithinPolicyWindow, logBookingActivity } from "@/lib/workflow";
import {
  notifyBookingCancelled,
  notifyBookingConfirmed,
  notifyBookingRescheduled,
} from "@/lib/notifications";

async function loadAuthorizedBooking(bookingId: string, user: { id: string; role: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      vehicle: true,
      slot: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          whatsappNumber: true,
          customerProfile: true,
        },
      },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          technician: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              whatsappNumber: true,
              technicianProfile: true,
            },
          },
        },
      },
      inspection: {
        include: {
          technician: {
            select: { id: true, name: true, email: true, phone: true, technicianProfile: true },
          },
          reviewedBy: { select: { id: true, name: true, email: true } },
          responses: {
            include: {
              checklistItem: {
                include: { category: true },
              },
            },
          },
          media: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              mediaType: true,
              originalName: true,
              mimeType: true,
              fileSize: true,
              categoryTag: true,
              caption: true,
              createdAt: true,
            },
          },
        },
      },
      report: true,
      payments: { orderBy: { createdAt: "desc" } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });

  if (!booking) return { errorStatus: 404 as const, error: "Booking not found" };

  if (user.role === "CUSTOMER" && booking.customerId !== user.id) {
    return { errorStatus: 403 as const, error: "You do not have access to this booking." };
  }

  if (user.role === "TECHNICIAN") {
    const isAssigned = booking.assignments.some(
      (a) => a.isActive && a.technicianId === user.id
    );
    if (!isAssigned) {
      return {
        errorStatus: 403 as const,
        error: "You are not assigned to this inspection.",
      };
    }
  }

  return { booking };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await context.params;
  const result = await loadAuthorizedBooking(id, auth.user);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.errorStatus });
  }

  return NextResponse.json({ booking: result.booking });
}

const patchBookingSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CONFIRM"),
    adminNotes: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("REJECT"),
    reason: z.string().trim().min(3, "Rejection reason is required"),
  }),
  z.object({
    action: z.literal("CANCEL"),
    reason: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("RESCHEDULE"),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slotId: z.string().min(1),
    reason: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("UPDATE_STATUS"),
    status: z.string().min(1),
    notes: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("MARK_COMPLETED"),
    notes: z.string().trim().optional(),
  }),
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user;

  const { id } = await context.params;
  const access = await loadAuthorizedBooking(id, user);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.errorStatus });
  }
  const booking = access.booking;

  try {
    const body = await request.json();
    const parsed = patchBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid booking update request" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });

    if (data.action === "CONFIRM") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Admin permission required" }, { status: 403 });
      }
      if (!canTransitionStatus(booking.status, "CONFIRMED")) {
        return NextResponse.json(
          { error: `Cannot confirm booking from status ${booking.status}.` },
          { status: 400 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          ...(data.adminNotes ? { adminNotes: data.adminNotes } : {}),
        },
      });
      await logBookingActivity({
        bookingId: booking.id,
        actorId: user.id,
        actorRole: user.role,
        action: "BOOKING_CONFIRMED",
        fromStatus: booking.status,
        toStatus: "CONFIRMED",
        details: data.adminNotes || "Booking confirmed by administrator.",
      });
      await notifyBookingConfirmed(booking.id);
      return NextResponse.json({ booking: updated });
    }

    if (data.action === "REJECT") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Admin permission required" }, { status: 403 });
      }
      if (["COMPLETED", "CANCELLED", "REJECTED"].includes(booking.status)) {
        return NextResponse.json(
          { error: `Cannot reject booking in status ${booking.status}.` },
          { status: 400 }
        );
      }
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "REJECTED",
          cancellationReason: data.reason,
        },
      });
      await logBookingActivity({
        bookingId: booking.id,
        actorId: user.id,
        actorRole: user.role,
        action: "BOOKING_REJECTED",
        fromStatus: booking.status,
        toStatus: "REJECTED",
        details: `Rejected: ${data.reason}`,
      });
      await notifyBookingCancelled(booking.id, data.reason);
      return NextResponse.json({ booking: updated });
    }

    if (data.action === "CANCEL") {
      if (user.role === "TECHNICIAN") {
        return NextResponse.json({ error: "Technicians cannot cancel bookings" }, { status: 403 });
      }
      if (
        ["INSPECTION_SUBMITTED", "UNDER_REVIEW", "APPROVED", "REPORT_DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(
          booking.status
        )
      ) {
        return NextResponse.json(
          { error: `Booking cannot be cancelled in status ${booking.status}.` },
          { status: 400 }
        );
      }
      if (
        user.role === "CUSTOMER" &&
        !isWithinPolicyWindow(booking.scheduledDate, booking.slot.startTime, settings.cancellationWindowHours)
      ) {
        return NextResponse.json(
          {
            error: `Cancellations must be made at least ${settings.cancellationWindowHours} hours prior to the scheduled inspection.`,
          },
          { status: 400 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancellationReason: data.reason || "Cancelled by user",
        },
      });
      await logBookingActivity({
        bookingId: booking.id,
        actorId: user.id,
        actorRole: user.role,
        action: "BOOKING_CANCELLED",
        fromStatus: booking.status,
        toStatus: "CANCELLED",
        details: data.reason || `Cancelled by ${user.role.toLowerCase()}.`,
      });
      await notifyBookingCancelled(booking.id, data.reason);
      return NextResponse.json({ booking: updated });
    }

    if (data.action === "RESCHEDULE") {
      if (user.role === "TECHNICIAN") {
        return NextResponse.json({ error: "Technicians cannot reschedule bookings" }, { status: 403 });
      }
      if (
        ["INSPECTION_STARTED", "INSPECTION_SUBMITTED", "UNDER_REVIEW", "APPROVED", "REPORT_DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(
          booking.status
        )
      ) {
        return NextResponse.json(
          { error: `Booking cannot be rescheduled in status ${booking.status}.` },
          { status: 400 }
        );
      }
      if (data.scheduledDate < getTodayDateStr()) {
        return NextResponse.json({ error: "New date cannot be in the past." }, { status: 400 });
      }
      if (
        user.role === "CUSTOMER" &&
        !isWithinPolicyWindow(booking.scheduledDate, booking.slot.startTime, settings.rescheduleWindowHours)
      ) {
        return NextResponse.json(
          {
            error: `Rescheduling requires at least ${settings.rescheduleWindowHours} hours notice prior to the current slot.`,
          },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const [newSlot, blocked] = await Promise.all([
          tx.availabilitySlot.findUnique({ where: { id: data.slotId } }),
          tx.blockedDate.findUnique({ where: { dateStr: data.scheduledDate } }),
        ]);
        if (!newSlot || !newSlot.isActive) {
          throw new Error("Selected time slot is unavailable.");
        }
        if (blocked) {
          throw new Error(`Selected date is blocked: ${blocked.reason || "Unavailable"}.`);
        }

        const existingCount = await tx.booking.count({
          where: {
            id: { not: booking.id },
            scheduledDate: data.scheduledDate,
            slotId: newSlot.id,
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
        });
        if (existingCount >= newSlot.maxBookingsPerSlot) {
          throw new Error("Selected slot is fully booked. Please choose another time.");
        }

        return tx.booking.update({
          where: { id: booking.id },
          data: {
            rescheduledFromDate: booking.scheduledDate,
            rescheduledFromSlot: booking.timeSlotLabel,
            scheduledDate: data.scheduledDate,
            slotId: newSlot.id,
            timeSlotLabel: newSlot.label,
            status: "RESCHEDULED",
            adminNotes: data.reason ? `Reschedule note: ${data.reason}` : booking.adminNotes,
          },
        });
      });

      await logBookingActivity({
        bookingId: booking.id,
        actorId: user.id,
        actorRole: user.role,
        action: "BOOKING_RESCHEDULED",
        fromStatus: booking.status,
        toStatus: "RESCHEDULED",
        details: `Rescheduled from ${booking.scheduledDate} (${booking.timeSlotLabel}) to ${data.scheduledDate} (${updated.timeSlotLabel}).${
          data.reason ? ` Note: ${data.reason}` : ""
        }`,
      });
      await notifyBookingRescheduled(booking.id, data.scheduledDate, updated.timeSlotLabel);
      return NextResponse.json({ booking: updated });
    }

    if (data.action === "MARK_COMPLETED" || data.action === "UPDATE_STATUS") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Admin permission required" }, { status: 403 });
      }
      const targetStatus = data.action === "MARK_COMPLETED" ? "COMPLETED" : data.status;
      if (!canTransitionStatus(booking.status, targetStatus)) {
        return NextResponse.json(
          { error: `Invalid transition from ${booking.status} to ${targetStatus}.` },
          { status: 400 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: targetStatus },
      });
      await logBookingActivity({
        bookingId: booking.id,
        actorId: user.id,
        actorRole: user.role,
        action: "STATUS_UPDATED",
        fromStatus: booking.status,
        toStatus: targetStatus,
        details: data.notes || `Status changed to ${targetStatus}.`,
      });
      return NextResponse.json({ booking: updated });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    console.error("Patch booking error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update booking" },
      { status: 400 }
    );
  }
}

