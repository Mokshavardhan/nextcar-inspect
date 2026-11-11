import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getDashboardPathForRole } from "@/lib/auth";
import { AdminInspectionReviewClient } from "@/components/dashboard/admin/AdminInspectionReviewClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(getDashboardPathForRole(user.role));

  const { bookingId } = await params;
  const [booking, categories] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        vehicle: true,
        report: true,
        inspection: {
          include: {
            technician: {
              select: {
                name: true,
                email: true,
                phone: true,
                technicianProfile: { select: { employeeCode: true } },
              },
            },
            responses: true,
            media: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                mediaType: true,
                originalName: true,
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

  if (!booking || !booking.inspection) {
    notFound();
  }

  return (
    <AdminInspectionReviewClient
      booking={{ ...booking, inspection: booking.inspection }}
      categories={categories}
    />
  );
}

