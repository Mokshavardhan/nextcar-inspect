import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Gauge,
  MapPin,
  Phone,
  Mail,
  Star,
  CalendarCheck,
  UserCheck,
  ClipboardCheck,
  Award,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadPublicPlatformData } from "@/lib/public-data";
import { formatCurrency, parseChecklistSummary } from "@/lib/format";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { FaqAccordion } from "@/components/home/FaqAccordion";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ services, settings, dbConnected }, currentUser] = await Promise.all([
    loadPublicPlatformData(),
    getCurrentUser(),
  ]);

  const processSteps = [
    {
      step: "01",
      title: "Select Package & Location",
      desc: "Choose the inspection tier, enter vehicle details, and pin the vehicle location on the map.",
      icon: CalendarCheck,
    },
    {
      step: "02",
      title: "Technician Dispatched",
      desc: "A certified inspector is assigned and notified with full vehicle and slot details.",
      icon: UserCheck,
    },
    {
      step: "03",
      title: "5-Category Digital Audit",
      desc: "Exterior, Interior, Engine, Mechanical & Documents are scored alongside high-res photos.",
      icon: ClipboardCheck,
    },
    {
      step: "04",
      title: "Senior Quality Review",
      desc: "Our engineering lead verifies every rating, photo, and recommendation before certification.",
      icon: ShieldCheck,
    },
    {
      step: "05",
      title: "Download PDF Report",
      desc: "Receive instant email & WhatsApp alerts and download your color-coded report anytime.",
      icon: FileText,
    },
  ];

  const testimonials = [
    {
      name: "Vikram M.",
      role: "Pre-Purchase Buyer — Bengaluru",
      quote:
        "NextCar Inspect caught a concealed rear-quarter repaint and coolant seepage on a pre-owned SUV I was about to buy. Saved me from an expensive mistake.",
      vehicle: "2022 Hyundai Tucson",
    },
    {
      name: "Neha K.",
      role: "Private Car Buyer — Mumbai",
      quote:
        "Booking took three minutes, the technician arrived right on time at the seller's society, and the INR-transparent PDF report made price negotiation effortless.",
      vehicle: "2021 Honda City ZX",
    },
    {
      name: "Sanjay R.",
      role: "Fleet Operations Lead — Pune",
      quote:
        "Having every vehicle's inspection history, invoice status, and standardized Good/Attention/Critical ratings in one clean dashboard streamlined our fleet procurement.",
      vehicle: "Commercial SUV Fleet",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#172033]">
      <SiteHeader initialUser={currentUser} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-[#101B35] text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
            <div className="space-y-6 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-blue-200">
                <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
                Certified Independent Automotive Verification
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:leading-[1.12]">
                Know Your Vehicle Before You Make Your Move.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                On-site multi-point mechanical, diagnostic, structural, and document inspections
                performed by certified technicians — backed by admin-reviewed PDF reports with
                high-resolution photo evidence.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Book an Inspection
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Explore Our Services
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div>
                  <p className="text-2xl font-extrabold text-white">5-Point</p>
                  <p className="text-xs text-slate-300">System Audit Categories</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-white">Same Day</p>
                  <p className="text-xs text-slate-300">Quality-Reviewed PDF</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-white">100%</p>
                  <p className="text-xs text-slate-300">Unbiased & Independent</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                <img
                  src="/images/hero-inspection.jpg"
                  alt="Certified vehicle specialist conducting digital diagnostic inspection"
                  className="h-[320px] w-full object-cover sm:h-[420px]"
                />
                <div className="flex items-center justify-between border-t border-white/10 bg-[#101B35]/95 px-5 py-3.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                    Live Diagnostic Telemetry & Paint Depth Calibration
                  </div>
                  <span className="font-semibold text-blue-300">ISO-Standard Workflow</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INSPECTION SERVICES */}
        <section id="services" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Inspection Packages
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-[#101B35] sm:text-3xl">
                Our Inspection Services
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Transparent flat pricing with no hidden dealer fees. Select the inspection depth
                matched to your vehicle and purchase stage.
              </p>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB] hover:underline"
            >
              Compare All Packages
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {!dbConnected && (
            <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              Live database packages are temporarily unavailable. Verify <code>DATABASE_URL</code>{" "}
              (use your Supabase IPv4 Transaction/Session Pooler string in serverless deployments)
              and check <code>/api/health</code>.
            </div>
          )}

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => {
              const bullets = parseChecklistSummary(service.checklistSummary);
              return (
                <div
                  key={service.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#101B35]">{service.name}</h3>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-[#101B35]">
                      {formatCurrency(service.price, settings.currency)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
                      ~{service.durationMinutes} mins
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-600">
                    {service.description}
                  </p>

                  <ul className="mt-5 flex-1 space-y-2 border-t border-slate-100 pt-4">
                    {bullets.slice(0, 4).map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/book?service=${service.id}`}
                    className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#101B35] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2563EB]"
                  >
                    Book Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS (5-STEP PROCESS) */}
        <section id="how-it-works" className="border-y border-slate-200 bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                End-to-End Verification
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-[#101B35] sm:text-3xl">
                How It Works
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
                Every booking follows a structured, traceable 5-step audit workflow from slot
                confirmation to admin-certified PDF delivery.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {processSteps.map((st) => {
                const Icon = st.icon;
                return (
                  <div
                    key={st.step}
                    className="relative rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101B35] text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-extrabold tracking-widest text-[#2563EB]">
                        STEP {st.step}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-[#101B35]">{st.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{st.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WHY CHOOSE US */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img
                  src="/images/engine-inspection.jpg"
                  alt="Technician performing engine bay OBD-II diagnostic inspection"
                  className="h-64 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-xs font-bold text-[#101B35]">Under-Hood & OBD-II Diagnostics</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Fluid health, leak detection & live sensor readout
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-6">
                <img
                  src="/images/exterior-gauge.jpg"
                  alt="Paint thickness gauge verification on vehicle fender"
                  className="h-64 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-xs font-bold text-[#101B35]">Paint Depth & Structural Checks</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Detects hidden collision repairs and repainted panels
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Why Choose NextCar Inspect
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#101B35] sm:text-3xl">
                  Built on Engineering Accuracy & Complete Transparency
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Unlike generic checklist apps or dealership-affiliated checks, our technicians
                  work strictly for you. Every report undergoes dual-stage quality review before it
                  reaches your dashboard.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Gauge className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="mt-2.5 text-sm font-bold text-[#101B35]">Color-Coded Ratings</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Instant Good, Needs Attention, and Critical scoring across 26 core inspection
                    points.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Award className="h-5 w-5 text-[#16A34A]" />
                  <h3 className="mt-2.5 text-sm font-bold text-[#101B35]">Admin QC Certified</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    No unverified raw notes. Senior administrators audit evidence before releasing
                    your PDF.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <MapPin className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="mt-2.5 text-sm font-bold text-[#101B35]">Doorstep Mobility</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Pin exact GPS coordinates on our map picker and let our inspector come to the
                    car.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <FileText className="h-5 w-5 text-[#2563EB]" />
                  <h3 className="mt-2.5 text-sm font-bold text-[#101B35]">Photographic Proof</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Every defect, document check, and engine bay photo is embedded inside your
                    final report.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="border-t border-slate-200 bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Trusted By Vehicle Buyers
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-[#101B35] sm:text-3xl">
                Customer Testimonials
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6"
                >
                  <div>
                    <div className="flex gap-1 text-[#F59E0B]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-[#172033]">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <p className="text-sm font-bold text-[#101B35]">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.role} • {t.vehicle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ & CONTACT STRIP */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
              Common Questions
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#101B35] sm:text-3xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-8">
            <FaqAccordion />
          </div>

          <div className="mt-14 rounded-2xl border border-slate-200 bg-[#101B35] p-8 text-white sm:p-10">
            <div className="grid items-center gap-6 md:grid-cols-12">
              <div className="space-y-2 md:col-span-7">
                <h3 className="text-xl font-extrabold sm:text-2xl">
                  Ready to Schedule a Vehicle Inspection?
                </h3>
                <p className="text-sm text-slate-300">
                  Check live slot availability and receive certified findings before you commit.
                </p>
                <div className="flex flex-wrap gap-5 pt-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[#2563EB]" />
                    {settings.companyPhone}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#2563EB]" />
                    {settings.companyEmail}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 md:col-span-5 md:justify-end">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Book an Inspection
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

