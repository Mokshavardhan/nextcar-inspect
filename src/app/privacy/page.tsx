import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const currentUser = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <SiteHeader initialUser={currentUser} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <h1 className="text-3xl font-extrabold text-[#101B35]">Privacy Policy</h1>
          <p className="mt-2 text-xs text-slate-500">Effective Date: January 1, 2026</p>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
            <section>
              <h2 className="text-base font-bold text-[#101B35]">1. Information We Collect</h2>
              <p className="mt-1">
                We collect information necessary to schedule and execute vehicle inspections,
                including your name, email address, phone/WhatsApp number, inspection address and
                coordinates, vehicle specifications, and payment confirmation references.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-[#101B35]">2. Inspection Media & Reports</h2>
              <p className="mt-1">
                Photographs, diagnostic notes, and PDF inspection reports are stored securely and
                accessible strictly to the booking customer, the assigned certified technician
                during inspection execution, and authorized NextCar Inspect quality reviewers.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-[#101B35]">3. Notifications & Security</h2>
              <p className="mt-1">
                Contact details are used to deliver booking confirmations, technician assignment
                updates, and official inspection report notifications via Email, WhatsApp, and
                in-app alerts. Passwords are encrypted using industry-standard hashing and session
                tokens are stored in HTTP-only cookies.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

