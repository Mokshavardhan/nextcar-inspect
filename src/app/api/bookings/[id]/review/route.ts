import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { generateReportNumber } from "@/lib/format";
import { generateInspectionReportPdf } from "@/lib/pdf";
import { logBookingActivity } from "@/lib/workflow";
import {
  notifyBookingCancelled,
  notifyReportApprovedAndDelivered,
  notifyRevisionRequested,
} from "@/lib/notifications";

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("REQUEST_REVISION"),
    revisionNotes: z.string().trim().min(5, "Please specify what needs revision."),
  }),
  z.object({
    decision: z.literal("REJECT"),
    reason: z.string().trim().min(5, "Rejection reason is required."),
  }),
  z.object({
    decision: z.literal("APPROVE"),
    finalAssessment: z.string().trim().optional(),
    recommendations: z.string().trim().optional(),
  }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: bookingId } = await context.params;
  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid review payload" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        inspection: true,
        report: true,
      },
    });

    if (!booking || !booking.inspection) {
      return NextResponse.json(
        { error: "Submitted inspection record not found for this booking." },
        { status: 404 }
      );
    }

    const d = parsed.data;

    if (d.decision === "REQUEST_REVISION") {
      await prisma.$transaction([
        prisma.inspection.update({
          where: { id: booking.inspection.id },
          data: {
            isDraft: true,
            revisionNotes: d.revisionNotes,
            reviewedById: auth.user.id,
            reviewedAt: new Date(),
          },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data: { status: "REVISION_REQUESTED" },
        }),
      ]);

      await logBookingActivity({
        bookingId,
        actorId: auth.user.id,
        actorRole: "ADMIN",
        action: "REVISION_REQUESTED",
        fromStatus: booking.status,
        toStatus: "REVISION_REQUESTED",
        details: `Revision requested: ${d.revisionNotes}`,
      });

      await notifyRevisionRequested(bookingId, booking.inspection.technicianId, d.revisionNotes);

      return NextResponse.json({ status: "REVISION_REQUESTED" });
    }

    if (d.decision === "REJECT") {
      await prisma.$transaction([
        prisma.inspection.update({
          where: { id: booking.inspection.id },
          data: {
            reviewedById: auth.user.id,
            reviewedAt: new Date(),
          },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "REJECTED",
            cancellationReason: d.reason,
          },
        }),
      ]);

      await logBookingActivity({
        bookingId,
        actorId: auth.user.id,
        actorRole: "ADMIN",
        action: "INSPECTION_REJECTED",
        fromStatus: booking.status,
        toStatus: "REJECTED",
        details: `Inspection rejected: ${d.reason}`,
      });

      await notifyBookingCancelled(bookingId, d.reason);

      return NextResponse.json({ status: "REJECTED" });
    }

    // APPROVE & GENERATE FINAL PDF REPORT
    const now = new Date();
    await prisma.inspection.update({
      where: { id: booking.inspection.id },
      data: {
        isDraft: false,
        reviewedById: auth.user.id,
        reviewedAt: now,
        approvedAt: now,
        ...(d.finalAssessment ? { finalAssessment: d.finalAssessment } : {}),
        ...(d.recommendations ? { recommendations: d.recommendations } : {}),
      },
    });

    let reportNumber = booking.report?.reportNumber || generateReportNumber();
    if (!booking.report) {
      while (await prisma.inspectionReport.findUnique({ where: { reportNumber } })) {
        reportNumber = generateReportNumber();
      }
    }

    const pdfResult = await generateInspectionReportPdf({
      bookingId,
      reportNumber,
      isApproved: true,
    });

    const report = await prisma.inspectionReport.upsert({
      where: { bookingId },
      update: {
        isApproved: true,
        approvedAt: now,
        deliveredAt: now,
        filePath: pdfResult.filePath,
        summaryJson: pdfResult.summaryJson,
        generatedById: auth.user.id,
      },
      create: {
        reportNumber,
        bookingId,
        inspectionId: booking.inspection.id,
        generatedById: auth.user.id,
        isApproved: true,
        approvedAt: now,
        deliveredAt: now,
        filePath: pdfResult.filePath,
        summaryJson: pdfResult.summaryJson,
      },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "REPORT_DELIVERED" },
    });

    await logBookingActivity({
      bookingId,
      actorId: auth.user.id,
      actorRole: "ADMIN",
      action: "INSPECTION_APPROVED",
      fromStatus: booking.status,
      toStatus: "APPROVED",
      details: `Inspection approved by ${auth.user.name}. Official report ${reportNumber} generated.`,
    });

    await logBookingActivity({
      bookingId,
      actorId: auth.user.id,
      actorRole: "SYSTEM",
      action: "REPORT_DELIVERED",
      fromStatus: "APPROVED",
      toStatus: "REPORT_DELIVERED",
      details: `PDF report ${reportNumber} delivered to customer dashboard.`,
    });

    await notifyReportApprovedAndDelivered(bookingId, reportNumber);

    return NextResponse.json({
      status: "REPORT_DELIVERED",
      report,
    });
  } catch (err) {
    console.error("Review inspection error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process inspection review" },
      { status: 500 }
    );
  }
}

