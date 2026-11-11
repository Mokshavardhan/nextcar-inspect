import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Wrench, FileCheck2, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <SiteHeader initialUser={currentUser} />

      <main className="flex-1">
        <section className="bg-[#101B35] py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-300">About Us</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-extrabold sm:text-4xl">
              Independent Vehicle Verification Engineered for Smart Automotive Decisions
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              NextCar Inspect was created to eliminate guesswork when buying, selling, or
              maintaining vehicles. We combine ASE-certified automotive specialists with
              standardized digital checklists and quality-controlled engineering reports.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-6">
              <h2 className="text-2xl font-extrabold text-[#101B35]">
                Dual-Stage Inspection Integrity
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Every vehicle evaluated through our platform undergoes two independent quality
                gates. First, our field technician evaluates 26 structured checkpoints across
                Exterior, Interior, Engine, Mechanical, and Document Verification — capturing
                real-time photographs directly from the inspection site.
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                Second, our administrative quality review team inspects every uploaded photo and
                critical note before certifying and issuing the final color-coded PDF report. If
                anything needs closer inspection, we trigger a revision request before release.
              </p>

              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Wrench className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="mt-2 text-sm font-bold text-[#101B35]">Certified Technicians</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Vetted mechanical, EV/hybrid, and body structural specialists.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <FileCheck2 className="h-5 w-5 text-[#16A34A]" />
                  <h3 className="mt-2 text-sm font-bold text-[#101B35]">Verifiable Reports</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Every PDF report carries a unique audit ID and timestamped approval.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="mt-2 text-sm font-bold text-[#101B35]">Zero Conflict of Interest</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    We never sell cars or repair parts — our sole product is the truth.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Users className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="mt-2 text-sm font-bold text-[#101B35]">Built for Buyers & Fleets</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Seamless scheduling, live tracking, and archived inspection records.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:col-span-6">
              <img
                src="/images/engine-inspection.jpg"
                alt="Technician performing engine inspection"
                className="h-72 w-full rounded-2xl border border-slate-200 object-cover shadow-sm"
              />
              <img
                src="/images/exterior-gauge.jpg"
                alt="Digital paint depth inspection"
                className="h-64 w-full rounded-2xl border border-slate-200 object-cover shadow-sm"
              />
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
              <h3 className="text-xl font-extrabold text-[#101B35]">
                Need an inspection before buying your next car?
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Reserve a real-time inspection slot in minutes.
              </p>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Book an Inspection
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

