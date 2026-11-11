import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayDateStr } from "@/lib/format";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || getTodayDateStr();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format (YYYY-MM-DD required)" }, { status: 400 });
  }

  const todayStr = getTodayDateStr();
  const isPastDate = date < todayStr;

  const [blocked, slots, bookingsForDate] = await Promise.all([
    prisma.blockedDate.findUnique({ where: { dateStr: date } }),
    prisma.availabilitySlot.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
    }),
    prisma.booking.groupBy({
      by: ["slotId"],
      where: {
        scheduledDate: date,
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(bookingsForDate.map((b) => [b.slotId, b._count._all]));
  const now = new Date();
  const currentHHmm = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const enrichedSlots = slots.map((slot) => {
    const bookedCount = countMap.get(slot.id) || 0;
    const remainingSpots = Math.max(0, slot.maxBookingsPerSlot - bookedCount);
    const isPastTimeToday = date === todayStr && slot.startTime <= currentHHmm;
    const isAvailable = !isPastDate && !blocked && !isPastTimeToday && remainingSpots > 0;

    return {
      id: slot.id,
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxBookingsPerSlot: slot.maxBookingsPerSlot,
      bookedCount,
      remainingSpots,
      isAvailable,
      unavailableReason: isPastDate
        ? "Date in past"
        : blocked
        ? blocked.reason || "Date blocked"
        : isPastTimeToday
        ? "Time elapsed"
        : remainingSpots <= 0
        ? "Fully booked"
        : null,
    };
  });

  return NextResponse.json({
    date,
    isPastDate,
    isBlocked: Boolean(blocked),
    blockedReason: blocked?.reason || null,
    slots: enrichedSlots,
  });
}

