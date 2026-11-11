import React from "react";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ContactForm } from "@/components/contact/ContactForm";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [currentUser, settings] = await Promise.all([
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
            <p className="text-xs font-bold uppercase tracking-wider text-blue-300">Contact Us</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Speak With Our Inspection Coordination Team
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Questions about corporate fleets, custom diagnostic coverage, or active bookings?
              Reach our team directly below.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#101B35]">Direct Contact Details</h2>
                <div className="mt-5 space-y-4 text-sm text-slate-600">
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                    <div>
                      <p className="font-semibold text-[#101B35]">Phone & WhatsApp Dispatch</p>
                      <p>{settings.companyPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                    <div>
                      <p className="font-semibold text-[#101B35]">Email Support</p>
                      <p>{settings.companyEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                    <div>
                      <p className="font-semibold text-[#101B35]">Headquarters</p>
                      <p>{settings.companyAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                    <div>
                      <p className="font-semibold text-[#101B35]">Inspection Operating Hours</p>
                      <p>Monday – Sunday: 08:00 AM – 06:30 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

