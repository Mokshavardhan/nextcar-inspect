import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, CarFront, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency, parseChecklistSummary } from "@/lib/format";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [services, currentUser, settings] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getCurrentUser(),
    prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <SiteHeader initialUser={currentUser} />

      <main className="flex-1">
        <section className="bg-[#101B35] py-14 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Inspection Packages
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Comprehensive Vehicle Inspection Services
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Every service covers Car, SUV, and Motorcycle inspections performed by certified
              specialists with admin-verified PDF report delivery.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {services.map((service) => {
              const items = parseChecklistSummary(service.checklistSummary);
              return (
                <div
                  key={service.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
                >
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563EB]">
                          <CarFront className="h-3.5 w-3.5" />
                          Car • SUV • Bike
                        </span>
                        <h2 className="mt-3 text-2xl font-extrabold text-[#101B35]">
                          {service.name}
                        </h2>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-extrabold text-[#101B35]">
                          {formatCurrency(service.price, settings.currency)}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
                          Est. {service.durationMinutes} minutes
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-slate-600">
                      {service.description}
                    </p>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Inspection Checklist Summary
                      </h3>
                      <ul className="mt-3 space-y-2.5">
                        {items.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2.5 text-sm text-[#172033]">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
                      Includes Admin-Reviewed PDF Report
                    </span>
                    <Link
                      href={`/book?service=${service.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      Book Now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

