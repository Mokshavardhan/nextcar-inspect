import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(["TECHNICIAN", "ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: bookingId } = await context.params;

  if (auth.user.role === "TECHNICIAN") {
    const assigned = await prisma.technicianAssignment.findFirst({
      where: { bookingId, technicianId: auth.user.id, isActive: true },
    });
    if (!assigned) {
      return NextResponse.json(
        { error: "You are not assigned to this booking." },
        { status: 403 }
      );
    }
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    const mediaTypeRaw = String(formData.get("mediaType") || "PHOTO").toUpperCase();
    const mediaType = mediaTypeRaw === "DOCUMENT" ? "DOCUMENT" : "PHOTO";
    const categoryTag = String(formData.get("categoryTag") || "").trim() || null;
    const caption = String(formData.get("caption") || "").trim() || null;

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const inspection =
      (await prisma.inspection.findUnique({ where: { bookingId } })) ||
      (await prisma.inspection.create({
        data: {
          bookingId,
          technicianId: auth.user.id,
          isDraft: true,
        },
      }));

    const uploadDir = path.join(process.cwd(), "uploads", "inspections", bookingId);
    await fs.mkdir(uploadDir, { recursive: true });

    const createdMedia = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 10MB limit.` },
          { status: 400 }
        );
      }

      const mime = file.type || "application/octet-stream";
      const validSet = mediaType === "PHOTO" ? ALLOWED_IMAGE_TYPES : ALLOWED_DOC_TYPES;
      if (!validSet.has(mime)) {
        return NextResponse.json(
          { error: `Unsupported file type (${mime}) for "${file.name}".` },
          { status: 400 }
        );
      }

      const ext =
        mime === "application/pdf"
          ? ".pdf"
          : mime === "image/png"
          ? ".png"
          : mime === "image/webp"
          ? ".webp"
          : ".jpg";

      const fileName = `${crypto.randomUUID()}${ext}`;
      const relPath = path.join("uploads", "inspections", bookingId, fileName);
      const absPath = path.join(process.cwd(), relPath);

      const bytes = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(absPath, bytes);

      const saved = await prisma.inspectionMedia.create({
        data: {
          inspectionId: inspection.id,
          uploadedById: auth.user.id,
          mediaType,
          fileName,
          originalName: file.name || fileName,
          mimeType: mime,
          fileSize: file.size,
          storagePath: relPath,
          categoryTag,
          caption,
        },
      });
      createdMedia.push(saved);
    }

    return NextResponse.json({ media: createdMedia }, { status: 201 });
  } catch (err) {
    console.error("Media upload error:", err);
    return NextResponse.json({ error: "Failed to upload files" }, { status: 500 });
  }
}

