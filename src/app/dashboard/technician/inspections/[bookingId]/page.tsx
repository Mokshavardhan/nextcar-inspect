import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getDashboardPathForRole } from "@/lib/auth";
import { TechnicianInspectionWorkspace } from "@/components/dashboard/TechnicianInspectionWorkspace";

export const dynamic = "force-dynamic";

export default async function TechnicianInspectionDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TECHNICIAN") redirect(getDashboardPathForRole(user.role));

  const { bookingId } = await params;

  const [booking, categories] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        vehicle: true,
        assignments: { where: { isActive: true, technicianId: user.id } },
        inspection: {
          include: {
            responses: true,
            media: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                mediaType: true,
                originalName: true,
                mimeType: true,
                categoryTag: true,
                caption: true,
              },
            },
          },
        },
      },
    }),
    prisma.inspectionCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!booking || booking.assignments.length === 0) {
    notFound();
  }

  return <TechnicianInspectionWorkspace initialBooking={booking} categories={categories} />;
}

