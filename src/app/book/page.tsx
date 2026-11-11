import React, { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const dynamic = "force-dynamic";

export default async function BookInspectionPage() {
  const [services, settings, currentUser] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
    getCurrentUser(),
  ]);

  const savedVehicles =
    currentUser && currentUser.role === "CUSTOMER"
      ? await prisma.vehicle.findMany({
          where: { customerId: currentUser.id },
          orderBy: { createdAt: "desc" },
        })
      : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <SiteHeader initialUser={currentUser} />
      <main className="flex-1">
        <div className="bg-[#101B35] py-10 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              Book a Certified Vehicle Inspection
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Complete the 7-step booking workflow to reserve a real-time inspection slot.
            </p>
          </div>
        </div>
        <Suspense fallback={<div className="p-12 text-center text-sm">Loading booking wizard...</div>}>
          <BookingWizard
            services={services}
            settings={settings}
            initialUser={currentUser}
            savedVehicles={savedVehicles}
          />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

