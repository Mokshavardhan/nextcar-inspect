import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { checkAndNotifyOverdueInspections } from "@/lib/notifications";

export async function GET() {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const overdueCount = await checkAndNotifyOverdueInspections();

  const [bookings, payments, recentActivities, technicians, inquiriesCount] = await Promise.all([
    prisma.booking.findMany({
      select: {
        id: true,
        status: true,
        servicePrice: true,
        amountPaid: true,
        scheduledDate: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
      select: { amount: true, refundAmount: true, createdAt: true },
    }),
    prisma.bookingActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        actor: { select: { name: true, role: true } },
        booking: { select: { id: true, bookingNumber: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "TECHNICIAN" },
      select: {
        id: true,
        name: true,
        isActive: true,
        technicianProfile: true,
        assignmentsReceived: {
          where: { isActive: true },
          include: { booking: { select: { status: true } } },
        },
      },
    }),
    prisma.contactInquiry.count({ where: { status: "NEW" } }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const b of bookings) {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  }

  const totalRevenue = payments.reduce(
    (sum, p) => sum + Math.max(0, p.amount - p.refundAmount),
    0
  );

  const totalBookings = bookings.length;
  const pendingBookings = statusCounts["PENDING"] || 0;
  const confirmedBookings = statusCounts["CONFIRMED"] || 0;
  const assignedInspections =
    (statusCounts["TECHNICIAN_ASSIGNED"] || 0) +
    (statusCounts["INSPECTION_STARTED"] || 0) +
    (statusCounts["REVISION_REQUESTED"] || 0);
  const underReviewCount =
    (statusCounts["INSPECTION_SUBMITTED"] || 0) + (statusCounts["UNDER_REVIEW"] || 0);
  const completedInspections =
    (statusCounts["APPROVED"] || 0) +
    (statusCounts["REPORT_DELIVERED"] || 0) +
    (statusCounts["COMPLETED"] || 0);

  // Build 7-day booking & revenue trend
  const last7Days: Array<{ date: string; label: string; bookings: number; revenue: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const dayBookings = bookings.filter(
      (b) => b.createdAt.toISOString().slice(0, 10) === dateStr
    ).length;
    const dayRevenue = payments
      .filter((p) => p.createdAt.toISOString().slice(0, 10) === dateStr)
      .reduce((acc, p) => acc + Math.max(0, p.amount - p.refundAmount), 0);
    last7Days.push({ date: dateStr, label, bookings: dayBookings, revenue: dayRevenue });
  }

  const techPerformance = technicians.map((t) => {
    const active = t.assignmentsReceived.filter(
      (a) =>
        !["APPROVED", "REPORT_DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(
          a.booking.status
        )
    ).length;
    const completed = t.assignmentsReceived.filter((a) =>
      ["APPROVED", "REPORT_DELIVERED", "COMPLETED"].includes(a.booking.status)
    ).length;
    return {
      id: t.id,
      name: t.name,
      isActive: t.isActive,
      availabilityStatus: t.technicianProfile?.availabilityStatus || "AVAILABLE",
      rating: t.technicianProfile?.rating || 5.0,
      activeCount: active,
      completedCount: completed,
    };
  });

  return NextResponse.json({
    metrics: {
      totalBookings,
      pendingBookings,
      confirmedBookings,
      assignedInspections,
      underReviewCount,
      completedInspections,
      totalRevenue,
      overdueCount,
      openInquiries: inquiriesCount,
    },
    statusCounts,
    trend: last7Days,
    recentActivities,
    techPerformance,
  });
}

