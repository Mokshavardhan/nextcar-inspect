import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { generateReportNumber } from "@/lib/format";
import { generateInspectionReportPdf } from "@/lib/pdf";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;

  const { id: bookingId } = await context.params;
  const { searchParams } = new URL(request.url);
  const inlinePreview = searchParams.get("preview") === "1";

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      inspection: true,
      report: true,
      assignments: { where: { isActive: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const user = auth.user;
  if (user.role === "CUSTOMER") {
    if (booking.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!booking.report || !booking.report.isApproved) {
      return NextResponse.json(
        { error: "Inspection report is not yet approved by an administrator." },
        { status: 403 }
      );
    }
  } else if (user.role === "TECHNICIAN") {
    const assigned = booking.assignments.some((a) => a.technicianId === user.id);
    if (!assigned || !booking.report || !booking.report.isApproved) {
      return NextResponse.json({ error: "Report unavailable" }, { status: 403 });
    }
  }

  if (!booking.inspection) {
    return NextResponse.json(
      { error: "Inspection has not been recorded yet." },
      { status: 404 }
    );
  }

  let pdfBuffer: Buffer;
  const reportNumber = booking.report?.reportNumber || generateReportNumber();

  if (booking.report && !inlinePreview) {
    try {
      const absPath = path.join(process.cwd(), booking.report.filePath);
      pdfBuffer = await fs.readFile(absPath);
    } catch {
      const generated = await generateInspectionReportPdf({
        bookingId,
        reportNumber,
        isApproved: booking.report.isApproved,
      });
      pdfBuffer = generated.buffer;
    }
  } else {
    const generated = await generateInspectionReportPdf({
      bookingId,
      reportNumber,
      isApproved: Boolean(booking.report?.isApproved),
    });
    pdfBuffer = generated.buffer;
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${
        inlinePreview ? "inline" : "attachment"
      }; filename="NextCar-Report-${reportNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

