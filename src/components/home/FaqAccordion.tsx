"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How long does a vehicle inspection take?",
    a: "Depending on the selected package, inspections take between 45 and 90 minutes on-site. Basic inspections finish in roughly 45 minutes, while our comprehensive 150+ point Full Vehicle Inspection takes up to 90 minutes including road test and diagnostic scans.",
  },
  {
    q: "Do you inspect the vehicle at my location or the seller's address?",
    a: "Yes. Our certified mobile inspectors travel directly to the vehicle's parked location — whether at a private seller's driveway, dealership lot, office, or your home. Simply pin the address on the map during Step 4 of booking.",
  },
  {
    q: "When do I receive my official PDF inspection report?",
    a: "After the technician finishes the digital checklist and uploads photographs, our senior review team performs quality verification and issues your color-coded PDF report directly to your Customer Dashboard, usually within 2–4 hours of inspection completion.",
  },
  {
    q: "What payment options and cancellation policies apply?",
    a: "Depending on administrator policy settings, you can pay in full online, place a partial advance deposit, or choose Pay Later. Bookings can be cancelled or rescheduled directly from your dashboard up to 12 hours before the scheduled slot.",
  },
  {
    q: "Which vehicle types are covered?",
    a: "We inspect passenger Cars, SUVs, crossovers, hybrids/EVs, and Motorcycles (Bikes) across petrol, diesel, hybrid, electric, and CNG drivetrains.",
  },
];

export function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {FAQS.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50/70"
            >
              <span className="text-sm font-bold text-[#101B35] sm:text-base">{item.q}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                  isOpen ? "rotate-180 text-[#2563EB]" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

