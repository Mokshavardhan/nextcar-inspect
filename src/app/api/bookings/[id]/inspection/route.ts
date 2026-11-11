import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { logBookingActivity } from "@/lib/workflow";
import { notifyInspectionSubmitted } from "@/lib/notifications";

const saveInspectionSchema = z.object({
  overallCondition: z.enum(["GOOD", "NEEDS_ATTENTION", "CRITICAL"]).optional().nullable(),
  observations: z.string().trim().optional().nullable(),
  comments: z.string().trim().optional().nullable(),
  criticalIssues: z.string().trim().optional().nullable(),
  recommendations: z.string().trim().optional().nullable(),
  finalAssessment: z.string().trim().optional().nullable(),
  submit: z.boolean().default(false),
  responses: z.array(
    z.object({
      checklistItemId: z.string().min(1),
      rating: z.enum(["GOOD", "NEEDS_ATTENTION", "CRITICAL", "NOT_APPLICABLE"]),
      notes: z.string().trim().optional().nullable(),
    })
  ),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(["TECHNICIAN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: bookingId } = await context.params;
  try {
    const assignment = await prisma.technicianAssignment.findFirst({
      where: { bookingId, technicianId: auth.user.id, isActive: true },
      include: { booking: true },
    });
    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this booking." },
        { status: 403 }
      );
    }

    const booking = assignment.booking;
    if (
      !["TECHNICIAN_ASSIGNED", "INSPECTION_STARTED", "REVISION_REQUESTED"].includes(
        booking.status
      )
    ) {
      return NextResponse.json(
        { error: `Inspection cannot be modified while booking is ${booking.status}.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = saveInspectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid inspection payload" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    if (d.submit) {
      const totalItems = await prisma.inspectionChecklistItem.count();
      const responseItemIds = new Set(d.responses.map((r) => r.checklistItemId));
      if (responseItemIds.size < totalItems) {
        return NextResponse.json(
          {
            error: `Please evaluate all ${totalItems} checklist items before submitting (${responseItemIds.size}/${totalItems} completed).`,
          },
          { status: 400 }
        );
      }
      if (!d.overallCondition) {
        return NextResponse.json(
          { error: "Please select an overall vehicle condition rating before submitting." },
          { status: 400 }
        );
      }
      if (!d.observations || d.observations.length < 5) {
        return NextResponse.json(
          { error: "Please add technician observations before submitting." },
          { status: 400 }
        );
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.inspection.findUnique({ where: { bookingId } });
      const insp = existing
        ? await tx.inspection.update({
            where: { id: existing.id },
            data: {
              technicianId: auth.user.id,
              overallCondition: d.overallCondition ?? null,
              observations: d.observations ?? null,
              comments: d.comments ?? null,
              criticalIssues: d.criticalIssues ?? null,
              recommendations: d.recommendations ?? null,
              finalAssessment: d.finalAssessment ?? null,
              isDraft: !d.submit,
              ...(d.submit ? { submittedAt: new Date() } : {}),
            },
          })
        : await tx.inspection.create({
            data: {
              bookingId,
              technicianId: auth.user.id,
              overallCondition: d.overallCondition ?? null,
              observations: d.observations ?? null,
              comments: d.comments ?? null,
              criticalIssues: d.criticalIssues ?? null,
              recommendations: d.recommendations ?? null,
              finalAssessment: d.finalAssessment ?? null,
              isDraft: !d.submit,
              ...(d.submit ? { submittedAt: new Date() } : {}),
            },
          });

      for (const resp of d.responses) {
        await tx.inspectionResponse.upsert({
          where: {
            inspectionId_checklistItemId: {
              inspectionId: insp.id,
              checklistItemId: resp.checklistItemId,
            },
          },
          update: {
            rating: resp.rating,
            notes: resp.notes ?? null,
          },
          create: {
            inspectionId: insp.id,
            checklistItemId: resp.checklistItemId,
            rating: resp.rating,
            notes: resp.notes ?? null,
          },
        });
      }

      if (d.submit) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "UNDER_REVIEW" },
        });
      } else if (booking.status === "TECHNICIAN_ASSIGNED") {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "INSPECTION_STARTED" },
        });
      }

      return insp;
    });

    if (d.submit) {
      await logBookingActivity({
        bookingId,
        actorId: auth.user.id,
        actorRole: "TECHNICIAN",
        action: "INSPECTION_SUBMITTED",
        fromStatus: booking.status,
        toStatus: "INSPECTION_SUBMITTED",
        details: `Technician ${auth.user.name} submitted completed inspection checklist.`,
      });
      await logBookingActivity({
        bookingId,
        actorId: auth.user.id,
        actorRole: "SYSTEM",
        action: "MOVED_TO_UNDER_REVIEW",
        fromStatus: "INSPECTION_SUBMITTED",
        toStatus: "UNDER_REVIEW",
        details: "Inspection queued for administrator quality review.",
      });
      await notifyInspectionSubmitted(bookingId);
    } else if (booking.status === "TECHNICIAN_ASSIGNED") {
      await logBookingActivity({
        bookingId,
        actorId: auth.user.id,
        actorRole: "TECHNICIAN",
        action: "INSPECTION_STARTED",
        fromStatus: booking.status,
        toStatus: "INSPECTION_STARTED",
        details: "Inspection draft saved.",
      });
    }

    return NextResponse.json({ inspection: saved, submitted: d.submit });
  } catch (err) {
    console.error("Save inspection error:", err);
    return NextResponse.json({ error: "Failed to save inspection" }, { status: 500 });
  }
}

