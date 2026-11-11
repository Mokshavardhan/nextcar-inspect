export const USER_ROLES = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  TECHNICIAN_ASSIGNED: "TECHNICIAN_ASSIGNED",
  INSPECTION_STARTED: "INSPECTION_STARTED",
  INSPECTION_SUBMITTED: "INSPECTION_SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  APPROVED: "APPROVED",
  REPORT_DELIVERED: "REPORT_DELIVERED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  RESCHEDULED: "RESCHEDULED",
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_LIFECYCLE_STEPS: BookingStatus[] = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.TECHNICIAN_ASSIGNED,
  BOOKING_STATUS.INSPECTION_STARTED,
  BOOKING_STATUS.INSPECTION_SUBMITTED,
  BOOKING_STATUS.UNDER_REVIEW,
  BOOKING_STATUS.APPROVED,
  BOOKING_STATUS.REPORT_DELIVERED,
  BOOKING_STATUS.COMPLETED,
];

export const BOOKING_STATUS_META: Record<
  string,
  { label: string; colorClass: string; badgeBg: string; badgeText: string }
> = {
  PENDING: {
    label: "Pending",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200",
    badgeBg: "#FEF3C7",
    badgeText: "#B45309",
  },
  CONFIRMED: {
    label: "Confirmed",
    colorClass: "bg-blue-50 text-blue-700 border-blue-200",
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
  },
  TECHNICIAN_ASSIGNED: {
    label: "Technician Assigned",
    colorClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    badgeBg: "#E0E7FF",
    badgeText: "#4338CA",
  },
  INSPECTION_STARTED: {
    label: "Inspection Started",
    colorClass: "bg-sky-50 text-sky-700 border-sky-200",
    badgeBg: "#E0F2FE",
    badgeText: "#0369A1",
  },
  INSPECTION_SUBMITTED: {
    label: "Inspection Submitted",
    colorClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
    badgeBg: "#CFFAFE",
    badgeText: "#0E7490",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    colorClass: "bg-purple-50 text-purple-700 border-purple-200",
    badgeBg: "#F3E8FF",
    badgeText: "#7E22CE",
  },
  REVISION_REQUESTED: {
    label: "Revision Requested",
    colorClass: "bg-orange-50 text-orange-700 border-orange-200",
    badgeBg: "#FFEDD5",
    badgeText: "#C2410C",
  },
  APPROVED: {
    label: "Approved",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badgeBg: "#D1FAE5",
    badgeText: "#047857",
  },
  REPORT_DELIVERED: {
    label: "Report Delivered",
    colorClass: "bg-teal-50 text-teal-700 border-teal-200",
    badgeBg: "#CCFBF1",
    badgeText: "#0F766E",
  },
  COMPLETED: {
    label: "Completed",
    colorClass: "bg-green-50 text-green-700 border-green-200",
    badgeBg: "#DCFCE7",
    badgeText: "#15803D",
  },
  CANCELLED: {
    label: "Cancelled",
    colorClass: "bg-slate-100 text-slate-600 border-slate-200",
    badgeBg: "#F1F5F9",
    badgeText: "#475569",
  },
  REJECTED: {
    label: "Rejected",
    colorClass: "bg-red-50 text-red-700 border-red-200",
    badgeBg: "#FEE2E2",
    badgeText: "#B91C1C",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200",
    badgeBg: "#FEF3C7",
    badgeText: "#B45309",
  },
};

export const CHECKLIST_RATING = {
  GOOD: "GOOD",
  NEEDS_ATTENTION: "NEEDS_ATTENTION",
  CRITICAL: "CRITICAL",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;

export type ChecklistRating = (typeof CHECKLIST_RATING)[keyof typeof CHECKLIST_RATING];

export const RATING_META: Record<
  ChecklistRating,
  { label: string; colorHex: string; badgeClass: string; buttonActiveClass: string }
> = {
  GOOD: {
    label: "Good",
    colorHex: "#16A34A",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    buttonActiveClass: "bg-[#16A34A] text-white border-[#16A34A]",
  },
  NEEDS_ATTENTION: {
    label: "Needs Attention",
    colorHex: "#F59E0B",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    buttonActiveClass: "bg-[#F59E0B] text-white border-[#F59E0B]",
  },
  CRITICAL: {
    label: "Critical",
    colorHex: "#DC2626",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    buttonActiveClass: "bg-[#DC2626] text-white border-[#DC2626]",
  },
  NOT_APPLICABLE: {
    label: "Not Applicable",
    colorHex: "#64748B",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    buttonActiveClass: "bg-slate-600 text-white border-slate-600",
  },
};

export const PAYMENT_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  UNPAID: { label: "Unpaid", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  PENDING: { label: "Pending", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  PARTIALLY_PAID: { label: "Advance Paid", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  PAID: { label: "Paid", badgeClass: "bg-green-50 text-green-700 border-green-200" },
  FAILED: { label: "Failed", badgeClass: "bg-red-50 text-red-700 border-red-200" },
  REFUNDED: { label: "Refunded", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  PARTIALLY_REFUNDED: {
    label: "Partially Refunded",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

export const VEHICLE_TYPES = ["CAR", "SUV", "BIKE"] as const;
export const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric", "CNG"] as const;
export const TRANSMISSION_TYPES = ["Automatic", "Manual", "CVT", "DCT / Dual-Clutch"] as const;

export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "TECHNICIAN_ASSIGNED", "RESCHEDULED", "CANCELLED", "REJECTED"],
  CONFIRMED: ["TECHNICIAN_ASSIGNED", "RESCHEDULED", "CANCELLED", "REJECTED"],
  RESCHEDULED: ["CONFIRMED", "TECHNICIAN_ASSIGNED", "CANCELLED", "REJECTED"],
  TECHNICIAN_ASSIGNED: ["INSPECTION_STARTED", "RESCHEDULED", "CANCELLED", "TECHNICIAN_ASSIGNED"],
  INSPECTION_STARTED: ["INSPECTION_SUBMITTED", "UNDER_REVIEW", "CANCELLED"],
  INSPECTION_SUBMITTED: ["UNDER_REVIEW", "REVISION_REQUESTED", "APPROVED"],
  UNDER_REVIEW: ["REVISION_REQUESTED", "APPROVED", "REJECTED"],
  REVISION_REQUESTED: ["INSPECTION_STARTED", "INSPECTION_SUBMITTED", "UNDER_REVIEW"],
  APPROVED: ["REPORT_DELIVERED", "COMPLETED"],
  REPORT_DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

