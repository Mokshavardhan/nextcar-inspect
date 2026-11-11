"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  User as UserIcon,
  Wrench,
  XCircle,
  Eye,
} from "lucide-react";
import { DashboardShell, type NavTab } from "@/components/dashboard/DashboardShell";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { BookingLifecycleTracker } from "@/components/booking/BookingLifecycleTracker";
import {
  PaymentCheckoutPanel,
  type PaymentIntentData,
} from "@/components/booking/PaymentCheckoutPanel";
import { formatCurrency, formatDate, getTodayDateStr } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";

interface BookingItem {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  paymentOption: string;
  servicePrice: number;
  amountPaid: number;
  scheduledDate: string;
  timeSlotLabel: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  service: { id: string; name: string; durationMinutes: number };
  vehicle: {
    id: string;
    vehicleType: string;
    manufacturer: string;
    model: string;
    manufacturingYear: number;
    registrationNumber: string;
    fuelType: string;
    transmissionType: string;
  };
  assignments: Array<{
    technician: {
      id: string;
      name: string;
      phone?: string | null;
      email: string;
      technicianProfile?: {
        employeeCode: string;
        specialties: string;
        rating: number;
      } | null;
    };
  }>;
  inspection?: {
    id: string;
    overallCondition?: string | null;
    observations?: string | null;
    recommendations?: string | null;
    finalAssessment?: string | null;
  } | null;
  report?: {
    id: string;
    reportNumber: string;
    isApproved: boolean;
    approvedAt?: string | null;
  } | null;
  activities?: Array<{
    id: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    details?: string | null;
    actorRole: string;
    createdAt: string;
    actor?: { name: string; role: string } | null;
  }>;
}

interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  customerProfile?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  } | null;
}

interface SlotOption {
  id: string;
  label: string;
  isAvailable: boolean;
  remainingSpots: number;
  unavailableReason: string | null;
}

export function CustomerDashboardClient({ initialUser }: { initialUser: CustomerUser }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailBooking, setDetailBooking] = useState<BookingItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(getTodayDateStr());
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotOption[]>([]);
  const [rescheduleSlotId, setRescheduleSlotId] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Payment modal
  const [payingBooking, setPayingBooking] = useState<BookingItem | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentData | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: initialUser.name,
    phone: initialUser.phone || "",
    whatsappNumber: initialUser.whatsappNumber || "",
    address: initialUser.customerProfile?.address || "",
    city: initialUser.customerProfile?.city || "",
    state: initialUser.customerProfile?.state || "",
    postalCode: initialUser.customerProfile?.postalCode || "",
    currentPassword: "",
    newPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      toast({ type: "error", title: "Unable to load bookings" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const openDetails = async (b: BookingItem) => {
    const res = await fetch(`/api/bookings/${b.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setDetailBooking(data.booking);
    } else {
      setDetailBooking(b);
    }
  };

  const initiatePay = async (b: BookingItem) => {
    setActionBusy(true);
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: b.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to initiate payment");
      setPayingBooking(b);
      setPaymentIntent(data.paymentIntent);
    } catch (err) {
      toast({
        type: "error",
        title: "Payment Error",
        description: err instanceof Error ? err.message : "Failed to initialize checkout",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/bookings/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCEL",
          reason: cancelReason || "Cancelled by customer",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");
      toast({ type: "success", title: "Booking Cancelled" });
      setCancelTarget(null);
      setCancelReason("");
      await loadBookings();
    } catch (err) {
      toast({
        type: "error",
        title: "Cancellation Blocked",
        description: err instanceof Error ? err.message : "Could not cancel booking",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const loadSlotsForReschedule = async (date: string) => {
    const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
    if (res.ok) {
      const data = await res.json();
      setRescheduleSlots(data.slots || []);
      setRescheduleSlotId("");
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !rescheduleSlotId) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/bookings/${rescheduleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESCHEDULE",
          scheduledDate: rescheduleDate,
          slotId: rescheduleSlotId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reschedule failed");
      toast({ type: "success", title: "Booking Rescheduled" });
      setRescheduleTarget(null);
      await loadBookings();
    } catch (err) {
      toast({
        type: "error",
        title: "Reschedule Failed",
        description: err instanceof Error ? err.message : "Could not reschedule",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          whatsappNumber: profileForm.whatsappNumber,
          address: profileForm.address,
          city: profileForm.city,
          state: profileForm.state,
          postalCode: profileForm.postalCode,
          ...(profileForm.newPassword
            ? {
                currentPassword: profileForm.currentPassword,
                newPassword: profileForm.newPassword,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update profile");
      toast({ type: "success", title: "Profile Updated" });
      setProfileForm((p) => ({ ...p, currentPassword: "", newPassword: "" }));
    } catch (err) {
      toast({
        type: "error",
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Error saving profile",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => !["APPROVED", "REPORT_DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(b.status)
  );
  const previousBookings = bookings.filter((b) =>
    ["APPROVED", "REPORT_DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(b.status)
  );
  const reportsReadyCount = bookings.filter((b) => b.report?.isApproved).length;

  const tabs: NavTab[] = [
    {
      id: "upcoming",
      label: "Upcoming Bookings",
      icon: <Calendar className="h-4 w-4" />,
      badge: upcomingBookings.length,
    },
    {
      id: "history",
      label: "Previous & Reports",
      icon: <FileText className="h-4 w-4" />,
      badge: reportsReadyCount,
    },
    {
      id: "profile",
      label: "Profile & Settings",
      icon: <UserIcon className="h-4 w-4" />,
    },
  ];

  const renderBookingCard = (b: BookingItem) => {
    const tech = b.assignments[0]?.technician;
    const balanceDue = Math.max(0, Math.round((b.servicePrice - b.amountPaid) * 100) / 100);
    const canModify = [
      "PENDING",
      "CONFIRMED",
      "TECHNICIAN_ASSIGNED",
      "RESCHEDULED",
    ].includes(b.status);

    return (
      <div
        key={b.id}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-[#101B35]">
                {b.bookingNumber}
              </span>
              <BookingStatusBadge status={b.status} />
              <PaymentStatusBadge status={b.paymentStatus} />
            </div>
            <h3 className="mt-1.5 text-base font-bold text-[#101B35]">{b.service.name}</h3>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-[#101B35]">
              {formatCurrency(b.servicePrice)}
            </p>
            <p className="text-xs text-slate-500">
              Paid: {formatCurrency(b.amountPaid)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <Car className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
            <div>
              <p className="font-semibold text-[#101B35]">
                {b.vehicle.manufacturingYear} {b.vehicle.manufacturer} {b.vehicle.model}
              </p>
              <p className="font-mono text-slate-500">
                {b.vehicle.registrationNumber} • {b.vehicle.vehicleType}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
            <div>
              <p className="font-semibold text-[#101B35]">{formatDate(b.scheduledDate)}</p>
              <p>{b.timeSlotLabel}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
            <div>
              <p className="font-semibold text-[#101B35]">{b.city}, {b.state}</p>
              <p className="truncate">{b.address}</p>
            </div>
          </div>
        </div>

        {tech && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50/60 px-3.5 py-2.5 text-xs">
            <span className="inline-flex items-center gap-2 font-semibold text-[#101B35]">
              <Wrench className="h-4 w-4 text-[#2563EB]" />
              Assigned Inspector: <strong>{tech.name}</strong> ({tech.technicianProfile?.employeeCode || "CERTIFIED"})
            </span>
            <span className="text-slate-600">{tech.phone || tech.email}</span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => openDetails(b)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#101B35] hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5 text-[#2563EB]" />
            Track & Details
          </button>

          {balanceDue > 0 && !["CANCELLED", "REJECTED"].includes(b.status) && (
            <button
              type="button"
              onClick={() => initiatePay(b)}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay {formatCurrency(balanceDue)}
            </button>
          )}

          {canModify && (
            <>
              <button
                type="button"
                onClick={() => {
                  setRescheduleTarget(b);
                  setRescheduleDate(b.scheduledDate);
                  loadSlotsForReschedule(b.scheduledDate);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => setCancelTarget(b)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-red-100"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            </>
          )}

          {b.report?.isApproved && (
            <a
              href={`/api/bookings/${b.id}/report`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-green-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF Report
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardShell
      roleLabel="Customer Portal"
      userName={initialUser.name}
      userEmail={initialUser.email}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={
        <Link
          href="/book"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      }
    >
      {/* Metrics Row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Bookings</p>
          <p className="mt-1 text-2xl font-extrabold text-[#101B35]">{bookings.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Active / Upcoming</p>
          <p className="mt-1 text-2xl font-extrabold text-[#2563EB]">{upcomingBookings.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Approved PDF Reports</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16A34A]">{reportsReadyCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Paid</p>
          <p className="mt-1 text-2xl font-extrabold text-[#101B35]">
            {formatCurrency(bookings.reduce((sum, b) => sum + b.amountPaid, 0))}
          </p>
        </div>
      </div>

      {activeTab === "upcoming" && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-[#101B35]">No Upcoming Bookings</h3>
              <p className="mt-1 text-sm text-slate-500">
                Schedule a certified inspection to evaluate a vehicle before you buy or sell.
              </p>
              <Link
                href="/book"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white"
              >
                Book an Inspection
              </Link>
            </div>
          ) : (
            upcomingBookings.map(renderBookingCard)
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {previousBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-[#101B35]">
                No Completed Inspections Yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Approved PDF inspection reports and closed bookings will appear here.
              </p>
            </div>
          ) : (
            previousBookings.map(renderBookingCard)
          )}
        </div>
      )}

      {activeTab === "profile" && (
        <form
          onSubmit={handleSaveProfile}
          className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-lg font-bold text-[#101B35]">Account & Contact Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
              <input
                type="email"
                disabled
                value={initialUser.email}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Mobile Number
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={profileForm.whatsappNumber}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, whatsappNumber: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Default Address
              </label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">City</label>
              <input
                type="text"
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">State</label>
                <input
                  type="text"
                  value={profileForm.state}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={profileForm.postalCode}
                  onChange={(e) => setProfileForm({ ...profileForm, postalCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-[#101B35]">Change Password (Optional)</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <input
                type="password"
                value={profileForm.currentPassword}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, currentPassword: e.target.value })
                }
                placeholder="Current password"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
              <input
                type="password"
                minLength={6}
                value={profileForm.newPassword}
                onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                placeholder="New password (min 6 chars)"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingProfile ? "Saving..." : "Save Profile Changes"}
          </button>
        </form>
      )}

      {/* Tracking & Detail Modal */}
      <Modal
        open={Boolean(detailBooking)}
        onClose={() => setDetailBooking(null)}
        title={`Booking ${detailBooking?.bookingNumber || ""}`}
        description={
          detailBooking
            ? `${detailBooking.service.name} • ${detailBooking.vehicle.manufacturingYear} ${detailBooking.vehicle.manufacturer} ${detailBooking.vehicle.model}`
            : ""
        }
        maxWidthClass="max-w-3xl"
      >
        {detailBooking && (
          <div className="space-y-6">
            <BookingLifecycleTracker
              currentStatus={detailBooking.status}
              activities={detailBooking.activities || []}
            />
            {detailBooking.report?.isApproved && (
              <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4">
                <div>
                  <p className="text-sm font-bold text-[#101B35]">
                    Official Report {detailBooking.report.reportNumber} Approved
                  </p>
                  <p className="text-xs text-slate-600">
                    Your certified PDF inspection report is ready for download.
                  </p>
                </div>
                <a
                  href={`/api/bookings/${detailBooking.id}/report`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-4 py-2 text-xs font-bold text-white hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={`Cancel Booking ${cancelTarget?.bookingNumber || ""}`}
        description="Cancellations are governed by the booking policy window."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <textarea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (optional)..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Keep Booking
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleCancelBooking}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {actionBusy ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title={`Reschedule ${rescheduleTarget?.bookingNumber || ""}`}
        description="Pick a new date and available slot."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleReschedule} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">New Date</label>
            <input
              type="date"
              min={getTodayDateStr()}
              value={rescheduleDate}
              onChange={(e) => {
                setRescheduleDate(e.target.value);
                loadSlotsForReschedule(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Available Slots
            </label>
            <div className="space-y-2">
              {rescheduleSlots.map((sl) => (
                <button
                  key={sl.id}
                  type="button"
                  disabled={!sl.isAvailable}
                  onClick={() => setRescheduleSlotId(sl.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${
                    !sl.isAvailable
                      ? "bg-slate-100 text-slate-400"
                      : rescheduleSlotId === sl.id
                      ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <span>{sl.label}</span>
                  <span>{sl.isAvailable ? `${sl.remainingSpots} left` : "Full"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleTarget(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionBusy || !rescheduleSlotId}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {actionBusy ? "Saving..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Online Balance Payment Modal */}
      <Modal
        open={Boolean(payingBooking && paymentIntent)}
        onClose={() => {
          setPayingBooking(null);
          setPaymentIntent(null);
        }}
        title={`Complete Payment — ${payingBooking?.bookingNumber || ""}`}
        maxWidthClass="max-w-lg"
      >
        {payingBooking && paymentIntent && (
          <PaymentCheckoutPanel
            bookingId={payingBooking.id}
            intent={paymentIntent}
            defaultName={initialUser.name}
            onSuccess={() => {
              setPayingBooking(null);
              setPaymentIntent(null);
              loadBookings();
            }}
            onCancel={() => {
              setPayingBooking(null);
              setPaymentIntent(null);
            }}
          />
        )}
      </Modal>
    </DashboardShell>
  );
}

