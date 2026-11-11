import React from "react";
import {
  BOOKING_STATUS_META,
  PAYMENT_STATUS_META,
  RATING_META,
  type ChecklistRating,
} from "@/lib/constants";

export function BookingStatusBadge({ status }: { status: string }) {
  const meta = BOOKING_STATUS_META[status] || {
    label: status.replace(/_/g, " "),
    colorClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.colorClass}`}
    >
      {meta.label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const meta = PAYMENT_STATUS_META[status] || {
    label: status.replace(/_/g, " "),
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

export function RatingBadge({ rating }: { rating: string | null | undefined }) {
  const key = (rating || "NOT_APPLICABLE") as ChecklistRating;
  const meta = RATING_META[key] || RATING_META.NOT_APPLICABLE;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

