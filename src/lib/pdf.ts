import PDFDocument from "pdfkit";
import fs from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { formatDate } from "./format";

const COLORS = {
  navy: "#101B35",
  blue: "#2563EB",
  bgLight: "#F8FAFC",
  border: "#CBD5E1",
  text: "#172033",
  muted: "#64748B",
  good: "#16A34A",
  goodBg: "#DCFCE7",
  attention: "#F59E0B",
  attentionBg: "#FEF3C7",
  critical: "#DC2626",
  criticalBg: "#FEE2E2",
  na: "#64748B",
  naBg: "#F1F5F9",
  white: "#FFFFFF",
};

function getRatingColors(rating: string) {
  switch (rating) {
    case "GOOD":
      return { label: "GOOD", fg: COLORS.good, bg: COLORS.goodBg };
    case "NEEDS_ATTENTION":
      return { label: "NEEDS ATTENTION", fg: COLORS.attention, bg: COLORS.attentionBg };
    case "CRITICAL":
      return { label: "CRITICAL", fg: COLORS.critical, bg: COLORS.criticalBg };
    default:
      return { label: "N/A", fg: COLORS.na, bg: COLORS.naBg };
  }
}

async function normalizeImageForPdf(storagePath: string): Promise<Buffer | null> {
  try {
    const absPath = path.isAbsolute(storagePath)
      ? storagePath
      : path.join(process.cwd(), storagePath);
    const raw = await fs.readFile(absPath);
    try {
      const sharpMod = await import("sharp");
      const sharpFn = sharpMod.default;
      return await sharpFn(raw)
        .rotate()
        .resize({ width: 900, height: 650, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

export async function generateInspectionReportPdf(params: {
  bookingId: string;
  reportNumber: string;
  isApproved: boolean;
}) {
  const [booking, settings, categories] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        vehicle: true,
        service: true,
        customer: true,
        assignments: {
          where: { isActive: true },
          include: {
            technician: {
              include: { technicianProfile: true },
            },
          },
          orderBy: { assignedAt: "desc" },
          take: 1,
        },
        inspection: {
          include: {
            technician: { include: { technicianProfile: true } },
            responses: true,
            media: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    }),
    prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
    prisma.inspectionCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  if (!booking || !booking.inspection) {
    throw new Error("Booking or inspection record not found for report generation.");
  }

  const inspection = booking.inspection;
  const responseMap = new Map(
    inspection.responses.map((r) => [r.checklistItemId, r])
  );

  // Tally overall statistics
  let countGood = 0;
  let countAttention = 0;
  let countCritical = 0;
  let countNA = 0;

  const categorySummaries = categories.map((cat) => {
    let g = 0;
    let a = 0;
    let c = 0;
    let n = 0;
    for (const item of cat.items) {
      const rating = responseMap.get(item.id)?.rating || "NOT_APPLICABLE";
      if (rating === "GOOD") {
        g++;
        countGood++;
      } else if (rating === "NEEDS_ATTENTION") {
        a++;
        countAttention++;
      } else if (rating === "CRITICAL") {
        c++;
        countCritical++;
      } else {
        n++;
        countNA++;
      }
    }
    return { name: cat.name, good: g, attention: a, critical: c, na: n };
  });

  const derivedCondition =
    inspection.overallCondition ||
    (countCritical > 0 ? "CRITICAL" : countAttention > 0 ? "NEEDS_ATTENTION" : "GOOD");

  const summary = {
    overallCondition: derivedCondition,
    counts: {
      good: countGood,
      needsAttention: countAttention,
      critical: countCritical,
      notApplicable: countNA,
    },
    categories: categorySummaries,
  };

  // Pre-load image buffers
  const photoMedia = inspection.media.filter((m) => m.mediaType === "PHOTO");
  const normalizedPhotos: Array<{
    buffer: Buffer;
    caption: string | null;
    categoryTag: string | null;
    originalName: string;
  }> = [];

  for (const photo of photoMedia) {
    const buf = await normalizeImageForPdf(photo.storagePath);
    if (buf) {
      normalizedPhotos.push({
        buffer: buf,
        caption: photo.caption,
        categoryTag: photo.categoryTag,
        originalName: photo.originalName,
      });
    }
  }

  const technician = inspection.technician || booking.assignments[0]?.technician;

  // Build PDF using PDFKit
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 42,
      bufferPages: true,
      info: {
        Title: `Vehicle Inspection Report - ${params.reportNumber}`,
        Author: settings.companyName,
        Subject: `Inspection Report for Booking ${booking.bookingNumber}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 84;

    const drawHeaderBanner = (compact = false) => {
      const h = compact ? 44 : 84;
      doc.save();
      doc.rect(0, 0, pageWidth, h).fill(COLORS.navy);
      doc.rect(0, h, pageWidth, 3).fill(COLORS.blue);

      // Vector shield emblem
      const sx = 42;
      const sy = compact ? 11 : 22;
      const size = compact ? 22 : 34;
      doc
        .moveTo(sx + size / 2, sy)
        .lineTo(sx + size, sy + size * 0.25)
        .lineTo(sx + size, sy + size * 0.62)
        .quadraticCurveTo(sx + size / 2, sy + size * 1.05, sx + size / 2, sy + size)
        .quadraticCurveTo(sx + size / 2, sy + size * 1.05, sx, sy + size * 0.62)
        .lineTo(sx, sy + size * 0.25)
        .closePath()
        .fill(COLORS.blue);

      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(compact ? 12 : 17)
        .text(settings.companyName, sx + size + 12, compact ? 12 : 21);

      if (!compact) {
        doc
          .fillColor("#CBD5E1")
          .font("Helvetica")
          .fontSize(9)
          .text(settings.companyTagline, sx + size + 12, 42)
          .text(`${settings.companyPhone}  |  ${settings.companyEmail}`, sx + size + 12, 55);
      }

      // Right side report meta
      doc
        .fillColor("#93C5FD")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("OFFICIAL INSPECTION REPORT", pageWidth - 220, compact ? 10 : 20, {
          width: 178,
          align: "right",
        });

      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(compact ? 11 : 14)
        .text(params.reportNumber, pageWidth - 220, compact ? 22 : 33, {
          width: 178,
          align: "right",
        });

      if (!compact) {
        doc
          .fillColor("#CBD5E1")
          .font("Helvetica")
          .fontSize(8.5)
          .text(
            `Booking: ${booking.bookingNumber}  |  Issued: ${formatDate(new Date())}`,
            pageWidth - 240,
            54,
            { width: 198, align: "right" }
          );
      }
      doc.restore();
      doc.y = h + 18;
    };

    const ensureSpace = (neededHeight: number) => {
      if (doc.y + neededHeight > doc.page.height - 58) {
        doc.addPage();
        drawHeaderBanner(true);
      }
    };

    // Page 1 Header
    drawHeaderBanner(false);

    // Approval & Overall Rating Strip
    const overallMeta = getRatingColors(derivedCondition);
    const bannerY = doc.y;
    doc.roundedRect(42, bannerY, contentWidth, 56, 8).fillAndStroke(COLORS.bgLight, COLORS.border);

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("OVERALL VEHICLE CONDITION", 56, bannerY + 11);

    doc.roundedRect(56, bannerY + 25, 138, 20, 4).fill(overallMeta.bg);
    doc
      .fillColor(overallMeta.fg)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(overallMeta.label, 56, bannerY + 30, { width: 138, align: "center" });

    // Summary counts on right of strip
    const statItems = [
      { label: "Good", count: countGood, color: COLORS.good },
      { label: "Attention", count: countAttention, color: COLORS.attention },
      { label: "Critical", count: countCritical, color: COLORS.critical },
      { label: "N/A", count: countNA, color: COLORS.na },
    ];
    statItems.forEach((st, idx) => {
      const boxX = 235 + idx * 78;
      doc
        .fillColor(st.color)
        .font("Helvetica-Bold")
        .fontSize(15)
        .text(String(st.count), boxX, bannerY + 12, { width: 68, align: "center" });
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(8)
        .text(st.label, boxX, bannerY + 32, { width: 68, align: "center" });
    });

    doc.y = bannerY + 68;

    // Two-column Metadata Cards: Customer/Booking & Vehicle/Technician
    const cardY = doc.y;
    const colW = (contentWidth - 14) / 2;
    const cardH = 122;

    // Left Card
    doc.roundedRect(42, cardY, colW, cardH, 6).strokeColor(COLORS.border).lineWidth(1).stroke();
    doc
      .fillColor(COLORS.navy)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text("CUSTOMER & BOOKING DETAILS", 54, cardY + 10);
    doc.moveTo(54, cardY + 25).lineTo(42 + colW - 12, cardY + 25).strokeColor("#E2E8F0").stroke();

    const leftRows = [
      ["Customer", booking.contactName],
      ["Email / Phone", `${booking.contactEmail} / ${booking.contactPhone}`],
      ["Inspection Service", booking.service.name],
      ["Scheduled Date", `${formatDate(booking.scheduledDate)} (${booking.timeSlotLabel})`],
      ["Inspection Location", `${booking.address}, ${booking.city}, ${booking.state}`],
    ];
    leftRows.forEach(([k, v], i) => {
      const ry = cardY + 32 + i * 17;
      doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(8).text(`${k}:`, 54, ry, { width: 85 });
      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(8)
        .text(v || "-", 138, ry, { width: colW - 106, ellipsis: true, lineBreak: false });
    });

    // Right Card
    const rightX = 42 + colW + 14;
    doc.roundedRect(rightX, cardY, colW, cardH, 6).strokeColor(COLORS.border).lineWidth(1).stroke();
    doc
      .fillColor(COLORS.navy)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text("VEHICLE & INSPECTOR DETAILS", rightX + 12, cardY + 10);
    doc
      .moveTo(rightX + 12, cardY + 25)
      .lineTo(rightX + colW - 12, cardY + 25)
      .strokeColor("#E2E8F0")
      .stroke();

    const rightRows = [
      [
        "Vehicle",
        `${booking.vehicle.manufacturingYear} ${booking.vehicle.manufacturer} ${booking.vehicle.model}`,
      ],
      ["Type / Reg No.", `${booking.vehicle.vehicleType}  |  ${booking.vehicle.registrationNumber}`],
      ["Powertrain", `${booking.vehicle.fuelType}  |  ${booking.vehicle.transmissionType}`],
      [
        "Technician",
        technician
          ? `${technician.name} (${technician.technicianProfile?.employeeCode || "CERTIFIED"})`
          : "Certified Specialist",
      ],
      [
        "Report Status",
        params.isApproved ? "ADMIN APPROVED & CERTIFIED" : "PRELIMINARY DRAFT PREVIEW",
      ],
    ];
    rightRows.forEach(([k, v], i) => {
      const ry = cardY + 32 + i * 17;
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(`${k}:`, rightX + 12, ry, { width: 80 });
      doc
        .fillColor(k === "Report Status" && params.isApproved ? COLORS.good : COLORS.text)
        .font(k === "Report Status" ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8)
        .text(v || "-", rightX + 92, ry, {
          width: colW - 104,
          ellipsis: true,
          lineBreak: false,
        });
    });

    doc.y = cardY + cardH + 16;

    // Inspection Summary Table by Category
    ensureSpace(125);
    doc
      .fillColor(COLORS.navy)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("CATEGORY ASSESSMENT SUMMARY", 42, doc.y);
    doc.y += 6;

    const tblY = doc.y;
    doc.rect(42, tblY, contentWidth, 22).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(8.5);
    doc.text("Category", 52, tblY + 7, { width: 220 });
    doc.text("Good", 280, tblY + 7, { width: 55, align: "center" });
    doc.text("Attention", 340, tblY + 7, { width: 65, align: "center" });
    doc.text("Critical", 410, tblY + 7, { width: 60, align: "center" });
    doc.text("N/A", 475, tblY + 7, { width: 65, align: "center" });

    let rowY = tblY + 22;
    categorySummaries.forEach((cs, idx) => {
      doc
        .rect(42, rowY, contentWidth, 20)
        .fill(idx % 2 === 0 ? COLORS.white : COLORS.bgLight)
        .strokeColor("#E2E8F0")
        .lineWidth(0.5);
      doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(8.5).text(cs.name, 52, rowY + 6, { width: 220 });
      doc.fillColor(COLORS.good).font("Helvetica-Bold").text(String(cs.good), 280, rowY + 6, { width: 55, align: "center" });
      doc.fillColor(COLORS.attention).font("Helvetica-Bold").text(String(cs.attention), 340, rowY + 6, { width: 65, align: "center" });
      doc.fillColor(COLORS.critical).font("Helvetica-Bold").text(String(cs.critical), 410, rowY + 6, { width: 60, align: "center" });
      doc.fillColor(COLORS.muted).font("Helvetica").text(String(cs.na), 475, rowY + 6, { width: 65, align: "center" });
      rowY += 20;
    });

    doc.y = rowY + 14;

    // Observations, Critical Issues, Recommendations, Final Assessment
    const narrativeBlocks: Array<{
      title: string;
      text: string | null | undefined;
      highlight?: "critical" | "normal";
    }> = [
      { title: "Critical Issues Identified", text: inspection.criticalIssues, highlight: "critical" },
      { title: "Technician Observations", text: inspection.observations || inspection.comments },
      { title: "Recommendations", text: inspection.recommendations },
      { title: "Final Assessment", text: inspection.finalAssessment },
    ];

    for (const block of narrativeBlocks) {
      if (!block.text || !block.text.trim()) continue;
      const textHeight = doc.heightOfString(block.text.trim(), {
        width: contentWidth - 24,
      });
      const boxHeight = Math.max(46, textHeight + 30);
      ensureSpace(boxHeight + 10);

      const boxY = doc.y;
      const isCrit = block.highlight === "critical";
      doc
        .roundedRect(42, boxY, contentWidth, boxHeight, 6)
        .fillAndStroke(
          isCrit ? COLORS.criticalBg : COLORS.bgLight,
          isCrit ? COLORS.critical : COLORS.border
        );

      doc
        .fillColor(isCrit ? COLORS.critical : COLORS.navy)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(block.title.toUpperCase(), 54, boxY + 10);

      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(9)
        .text(block.text.trim(), 54, boxY + 25, { width: contentWidth - 24 });

      doc.y = boxY + boxHeight + 10;
    }

    // Detailed Checklist Sections
    ensureSpace(40);
    doc
      .fillColor(COLORS.navy)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("DETAILED INSPECTION CHECKLIST", 42, doc.y);
    doc.y += 8;

    for (const category of categories) {
      ensureSpace(50);
      const catHeaderY = doc.y;
      doc.rect(42, catHeaderY, contentWidth, 22).fill(COLORS.navy);
      doc
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(category.name.toUpperCase(), 52, catHeaderY + 6);
      doc.y = catHeaderY + 24;

      for (const item of category.items) {
        const resp = responseMap.get(item.id);
        const rating = resp?.rating || "NOT_APPLICABLE";
        const rColors = getRatingColors(rating);
        const noteText = resp?.notes?.trim() || "";
        const noteHeight = noteText
          ? doc.heightOfString(`Notes: ${noteText}`, { width: contentWidth - 135 }) + 4
          : 0;
        const itemH = 22 + noteHeight;

        ensureSpace(itemH + 4);
        const iy = doc.y;

        doc
          .rect(42, iy, contentWidth, itemH)
          .fill(COLORS.white)
          .strokeColor("#E2E8F0")
          .lineWidth(0.5);

        doc
          .fillColor(COLORS.text)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(item.label, 52, iy + 6, { width: contentWidth - 150 });

        if (noteText) {
          doc
            .fillColor(COLORS.muted)
            .font("Helvetica")
            .fontSize(8)
            .text(`Notes: ${noteText}`, 52, iy + 19, { width: contentWidth - 150 });
        }

        const pillW = 96;
        const pillX = 42 + contentWidth - pillW - 10;
        doc.roundedRect(pillX, iy + 4, pillW, 14, 3).fill(rColors.bg);
        doc
          .fillColor(rColors.fg)
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(rColors.label, pillX, iy + 7.5, { width: pillW, align: "center" });

        doc.y = iy + itemH;
      }

      doc.y += 10;
    }

    // Uploaded Inspection Photographs
    if (normalizedPhotos.length > 0) {
      ensureSpace(60);
      doc
        .fillColor(COLORS.navy)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("INSPECTION PHOTOGRAPHS", 42, doc.y);
      doc.y += 10;

      const photoColW = (contentWidth - 14) / 2;
      const photoBoxH = 175;

      for (let i = 0; i < normalizedPhotos.length; i += 2) {
        ensureSpace(photoBoxH + 14);
        const rowTop = doc.y;

        for (let col = 0; col < 2; col++) {
          const item = normalizedPhotos[i + col];
          if (!item) continue;
          const px = 42 + col * (photoColW + 14);
          doc
            .roundedRect(px, rowTop, photoColW, photoBoxH, 6)
            .fillAndStroke(COLORS.bgLight, COLORS.border);

          try {
            doc.image(item.buffer, px + 8, rowTop + 8, {
              fit: [photoColW - 16, 132],
              align: "center",
              valign: "center",
            });
          } catch {
            doc
              .fillColor(COLORS.muted)
              .fontSize(8)
              .text("Image preview unavailable", px + 12, rowTop + 64, {
                width: photoColW - 24,
                align: "center",
              });
          }

          const captionLabel = [item.categoryTag, item.caption || item.originalName]
            .filter(Boolean)
            .join(" — ");
          doc
            .fillColor(COLORS.text)
            .font("Helvetica")
            .fontSize(8)
            .text(captionLabel, px + 8, rowTop + 148, {
              width: photoColW - 16,
              height: 22,
              ellipsis: true,
            });
        }

        doc.y = rowTop + photoBoxH + 12;
      }
    }

    // Add page footers to all buffered pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 34;
      doc
        .moveTo(42, footerY - 6)
        .lineTo(pageWidth - 42, footerY - 6)
        .strokeColor("#E2E8F0")
        .lineWidth(0.5)
        .stroke();

      doc
        .fillColor(COLORS.muted)
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          `${settings.companyName}  •  Report ${params.reportNumber}  •  Booking ${booking.bookingNumber}  •  Certified Vehicle Assessment`,
          42,
          footerY,
          { width: contentWidth - 80 }
        );
      doc
        .fillColor(COLORS.muted)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(`Page ${i + 1} of ${range.count}`, pageWidth - 122, footerY, {
          width: 80,
          align: "right",
        });
    }

    doc.end();
  });

  const reportsDir = path.join(process.cwd(), "uploads", "reports");
  await fs.mkdir(reportsDir, { recursive: true });
  const relPath = path.join("uploads", "reports", `${params.reportNumber}.pdf`);
  const absPath = path.join(process.cwd(), relPath);
  await fs.writeFile(absPath, pdfBuffer);

  return {
    filePath: relPath,
    buffer: pdfBuffer,
    summaryJson: JSON.stringify(summary),
    summary,
  };
}

