import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const includeLogs = searchParams.get("logs") === "true" && auth.user.role === "ADMIN";

  const [inAppNotifications, unreadCount, dispatchLogs] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.user.id, channel: "IN_APP" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        booking: { select: { id: true, bookingNumber: true } },
      },
    }),
    prisma.notification.count({
      where: { userId: auth.user.id, channel: "IN_APP", isRead: false },
    }),
    includeLogs
      ? prisma.notification.findMany({
          where: { channel: { in: ["EMAIL", "WHATSAPP"] } },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            booking: { select: { id: true, bookingNumber: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    notifications: inAppNotifications,
    unreadCount,
    ...(includeLogs ? { dispatchLogs } : {}),
  });
}

const markReadSchema = z.object({
  id: z.string().optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json().catch(() => ({}));
  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (parsed.data.markAll) {
    await prisma.notification.updateMany({
      where: { userId: auth.user.id, channel: "IN_APP", isRead: false },
      data: { isRead: true },
    });
  } else if (parsed.data.id) {
    await prisma.notification.updateMany({
      where: { id: parsed.data.id, userId: auth.user.id },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}

