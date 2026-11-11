import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";

async function authorizeMediaAccess(mediaId: string, user: { id: string; role: string }) {
  const media = await prisma.inspectionMedia.findUnique({
    where: { id: mediaId },
    include: {
      inspection: {
        include: {
          booking: {
            include: {
              assignments: { where: { isActive: true } },
            },
          },
        },
      },
    },
  });

  if (!media) return { errorStatus: 404 as const, error: "File not found" };

  const booking = media.inspection.booking;
  if (user.role === "ADMIN") return { media };
  if (user.role === "CUSTOMER" && booking.customerId === user.id) return { media };
  if (
    user.role === "TECHNICIAN" &&
    booking.assignments.some((a) => a.technicianId === user.id)
  ) {
    return { media };
  }

  return { errorStatus: 403 as const, error: "Forbidden" };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ mediaId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;

  const { mediaId } = await context.params;
  const access = await authorizeMediaAccess(mediaId, auth.user);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.errorStatus });
  }

  try {
    const absPath = path.isAbsolute(access.media.storagePath)
      ? access.media.storagePath
      : path.join(process.cwd(), access.media.storagePath);
    const buffer = await fs.readFile(absPath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": access.media.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(access.media.originalName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Media file missing on storage" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ mediaId: string }> }
) {
  const auth = await requireApiUser(["TECHNICIAN", "ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { mediaId } = await context.params;
  const access = await authorizeMediaAccess(mediaId, auth.user);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.errorStatus });
  }

  const media = access.media;
  if (auth.user.role === "TECHNICIAN" && !media.inspection.isDraft) {
    return NextResponse.json(
      { error: "Cannot delete evidence after submission." },
      { status: 400 }
    );
  }

  await prisma.inspectionMedia.delete({ where: { id: mediaId } });
  const absPath = path.join(process.cwd(), media.storagePath);
  await fs.unlink(absPath).catch(() => null);

  return NextResponse.json({ deleted: true });
}

