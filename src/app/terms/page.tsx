import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const currentUser = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <SiteHeader initialUser={currentUser} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <h1 className="text-3xl font-extrabold text-[#101B35]">Terms of Service</h1>
          <p className="mt-2 text-xs text-slate-500">Effective Date: January 1, 2026</p>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
            <section>
              <h2 className="text-base font-bold text-[#101B35]">1. Inspection Scope</h2>
              <p className="mt-1">
                Inspections represent a non-invasive visual, diagnostic, and road-test evaluation at
                the specific date and time performed. Reports reflect observable condition rather
                than a mechanical warranty.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-[#101B35]">
                2. Scheduling, Cancellation & Rescheduling
              </h2>
              <p className="mt-1">
                Customers may cancel or reschedule bookings through their dashboard prior to the
                configured policy window (default 12 hours before the scheduled slot). Slot
                availability is validated in real time to prevent double bookings.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-[#101B35]">3. Report Approval</h2>
              <p className="mt-1">
                Preliminary technician findings undergo quality review by an administrator before
                an official PDF report is approved and unlocked for customer download.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

