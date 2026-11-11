import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#101B35] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo variant="light" subtitle="Certified Vehicle Verification" />
            <p className="text-sm leading-relaxed text-slate-300">
              Independent, certified mobile and facility-based vehicle inspections designed to
              protect buyers, owners, and fleet operators with verified data.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Navigation</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-white transition">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-white transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Portals</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/book" className="hover:text-white transition">
                  Book an Inspection
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition">
                  Customer Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition">
                  Create Customer Account
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition">
                  Technician & Admin Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Contact Info</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                <span>+91 80 4123 5500</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                <span>support@nextcarinspect.in</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                <span>100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} NextCar Inspect. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

