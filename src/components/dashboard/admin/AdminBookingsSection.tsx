"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  UserPlus,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileCheck,
  Download,
} from "lucide-react";
import {
  ALLOWED_STATUS_TRANSITIONS,
  BOOKING_STATUS,
  BOOKING_STATUS_META,
} from "@/lib/constants";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { BookingLifecycleTracker } from "@/components/booking/BookingLifecycleTracker";
import { formatCurrency, formatDate, getTodayDateStr } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";

export interface AdminBookingRow {
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
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  customerNotes?: string | null;
  service: { id: string; name: string };
  vehicle: {
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
      technicianProfile?: { employeeCode: string } | null;
    };
  }>;
  report?: { id: string; reportNumber: string; isApproved: boolean } | null;
  inspection?: { id: string; overallCondition?: string | null } | null;
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

export interface TechnicianAssignedBookingSummary {
  id: string;
  bookingNumber: string;
  status: string;
  scheduledDate: string;
  timeSlotLabel: string;
  city: string;
  vehicle?: {
    manufacturer: string;
    model: string;
    manufacturingYear: number;
    registrationNumber: string;
  };
}

export interface AdminTechnicianRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  activeWorkloadCount: number;
  completedCount: number;
  activeBookings?: TechnicianAssignedBookingSummary[];
  completedBookings?: TechnicianAssignedBookingSummary[];
  technicianProfile?: {
    employeeCode: string;
    specialties: string;
    serviceCity: string;
    availabilityStatus: string;
    rating: number;
  } | null;
}

export function AdminBookingsSection({
  bookings,
  technicians,
  onRefresh,
  mode = "all",
}: {
  bookings: AdminBookingRow[];
  technicians: AdminTechnicianRow[];
  onRefresh: () => Promise<void>;
  mode?: "all" | "assign" | "reviews";
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");

  const [detailBooking, setDetailBooking] = useState<AdminBookingRow | null>(null);
  const [assignTarget, setAssignTarget] = useState<AdminBookingRow | null>(null);
  const [selectedTechId, setSelectedTechId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  const [rescheduleTarget, setRescheduleTarget] = useState<AdminBookingRow | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(getTodayDateStr());
  const [rescheduleSlots, setRescheduleSlots] = useState<
    Array<{ id: string; label: string; isAvailable: boolean; remainingSpots: number }>
  >([]);
  const [rescheduleSlotId, setRescheduleSlotId] = useState("");

  const [rejectTarget, setRejectTarget] = useState<AdminBookingRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = bookings.filter((b) => {
    if (mode === "assign") {
      const needsAssignment = ["PENDING", "CONFIRMED", "RESCHEDULED", "TECHNICIAN_ASSIGNED"].includes(
        b.status
      );
      if (!needsAssignment) return false;
    }
    if (mode === "reviews") {
      const inReviewPipeline = [
        "INSPECTION_SUBMITTED",
        "UNDER_REVIEW",
        "REVISION_REQUESTED",
        "APPROVED",
        "REPORT_DELIVERED",
        "COMPLETED",
      ].includes(b.status);
      if (!inReviewPipeline) return false;
    }

    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (dateFilter && b.scheduledDate !== dateFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        b.bookingNumber.toLowerCase().includes(q) ||
        b.contactName.toLowerCase().includes(q) ||
        b.vehicle.registrationNumber.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (customerFilter.trim()) {
      const cf = customerFilter.trim().toLowerCase();
      if (
        !b.contactName.toLowerCase().includes(cf) &&
        !b.contactEmail.toLowerCase().includes(cf)
      ) {
        return false;
      }
    }
    if (vehicleFilter.trim()) {
      const vf = vehicleFilter.trim().toLowerCase();
      const vehicleStr = `${b.vehicle.manufacturer} ${b.vehicle.model} ${b.vehicle.registrationNumber}`.toLowerCase();
      if (!vehicleStr.includes(vf)) return false;
    }
    return true;
  });

  const openDetails = async (b: AdminBookingRow) => {
    const res = await fetch(`/api/bookings/${b.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setDetailBooking(data.booking);
    } else {
      setDetailBooking(b);
    }
  };

  const runAction = async (bookingId: string, payload: Record<string, unknown>, label: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast({ type: "success", title: label });
      await onRefresh();
      if (detailBooking?.id === bookingId) {
        await openDetails(detailBooking);
      }
    } catch (err) {
      toast({
        type: "error",
        title: "Action Failed",
        description: err instanceof Error ? err.message : "Could not update booking",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget || !selectedTechId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${assignTarget.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: selectedTechId, notes: assignNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      toast({
        type: "success",
        title: "Technician Assigned",
        description: `Status updated to Technician Assigned and notifications sent.`,
      });
      setAssignTarget(null);
      setSelectedTechId("");
      setAssignNotes("");
      await onRefresh();
    } catch (err) {
      toast({
        type: "error",
        title: "Assignment Error",
        description: err instanceof Error ? err.message : "Could not assign technician",
      });
    } finally {
      setBusy(false);
    }
  };

  const loadSlots = async (date: string) => {
    const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
    if (res.ok) {
      const data = await res.json();
      setRescheduleSlots(data.slots || []);
      setRescheduleSlotId("");
    }
  };

  const availableTechs = technicians.filter((t) => t.isActive);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Booking ID / Reg..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <input
          type="text"
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          placeholder="Filter by customer..."
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none"
        />
        <input
          type="text"
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          placeholder="Filter by vehicle..."
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(BOOKING_STATUS).map(([k, val]) => (
            <option key={k} value={val}>
              {BOOKING_STATUS_META[val]?.label || val}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-[#F8FAFC] text-slate-600">
              <tr>
                <th className="px-4 py-3 font-bold">Booking ID</th>
                <th className="px-4 py-3 font-bold">Customer</th>
                <th className="px-4 py-3 font-bold">Vehicle & Service</th>
                <th className="px-4 py-3 font-bold">Schedule</th>
                <th className="px-4 py-3 font-bold">Technician</th>
                <th className="px-4 py-3 font-bold">Payment</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No matching bookings found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const assignedTech = b.assignments[0]?.technician;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-[#101B35]">
                        {b.bookingNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#101B35]">{b.contactName}</p>
                        <p className="text-[11px] text-slate-500">{b.contactPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#101B35]">
                          {b.vehicle.manufacturingYear} {b.vehicle.manufacturer} {b.vehicle.model}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {b.vehicle.registrationNumber} • {b.service.name}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#101B35]">{formatDate(b.scheduledDate)}</p>
                        <p className="text-[11px] text-slate-500">{b.timeSlotLabel}</p>
                      </td>
                      <td className="px-4 py-3">
                        {assignedTech ? (
                          <div>
                            <p className="font-semibold text-[#101B35]">{assignedTech.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {assignedTech.technicianProfile?.employeeCode}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={b.paymentStatus} />
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatCurrency(b.amountPaid)} / {formatCurrency(b.servicePrice)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetails(b)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {b.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() =>
                                runAction(b.id, { action: "CONFIRM" }, "Booking Confirmed")
                              }
                              className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-[#2563EB] hover:bg-blue-100"
                              title="Confirm Booking"
                            >
                              Confirm
                            </button>
                          )}

                          {["PENDING", "CONFIRMED", "RESCHEDULED", "TECHNICIAN_ASSIGNED"].includes(
                            b.status
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignTarget(b);
                                setSelectedTechId(assignedTech?.id || "");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#101B35] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#2563EB]"
                            >
                              <UserPlus className="h-3 w-3" />
                              {assignedTech ? "Reassign" : "Assign Tech"}
                            </button>
                          )}

                          {b.inspection && (
                            <Link
                              href={`/dashboard/admin/reviews/${b.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-purple-700"
                            >
                              <FileCheck className="h-3 w-3" />
                              Review
                            </Link>
                          )}

                          {b.report?.isApproved && (
                            <a
                              href={`/api/bookings/${b.id}/report`}
                              className="rounded-lg bg-[#16A34A] p-1.5 text-white hover:bg-green-700"
                              title="Download PDF Report"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      <Modal
        open={Boolean(detailBooking)}
        onClose={() => setDetailBooking(null)}
        title={`Booking ${detailBooking?.bookingNumber || ""}`}
        description={
          detailBooking
            ? `${detailBooking.service.name} • ${detailBooking.contactName} (${detailBooking.contactEmail})`
            : ""
        }
        maxWidthClass="max-w-4xl"
      >
        {detailBooking && (
          <div className="space-y-6">
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 text-xs sm:grid-cols-3">
              <div>
                <p className="font-bold text-slate-500">VEHICLE</p>
                <p className="mt-1 font-bold text-[#101B35]">
                  {detailBooking.vehicle.manufacturingYear} {detailBooking.vehicle.manufacturer}{" "}
                  {detailBooking.vehicle.model}
                </p>
                <p className="font-mono text-slate-600">
                  {detailBooking.vehicle.registrationNumber} • {detailBooking.vehicle.fuelType}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-500">LOCATION</p>
                <p className="mt-1 font-semibold text-[#101B35]">{detailBooking.address}</p>
                <p className="text-slate-600">
                  {detailBooking.city}, {detailBooking.state} {detailBooking.postalCode}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-500">ADMIN CONTROLS</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {detailBooking.status === "PENDING" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(detailBooking.id, { action: "CONFIRM" }, "Booking Confirmed")
                      }
                      className="inline-flex items-center gap-1 rounded bg-[#2563EB] px-2.5 py-1 font-bold text-white"
                    >
                      <CheckCircle className="h-3 w-3" /> Confirm
                    </button>
                  )}
                  {!["COMPLETED", "CANCELLED", "REJECTED"].includes(detailBooking.status) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleTarget(detailBooking);
                          setRescheduleDate(detailBooking.scheduledDate);
                          loadSlots(detailBooking.scheduledDate);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold"
                      >
                        <RefreshCw className="h-3 w-3" /> Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectTarget(detailBooking)}
                        className="inline-flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 font-bold text-white"
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            detailBooking.id,
                            { action: "CANCEL", reason: "Cancelled by administrator" },
                            "Booking Cancelled"
                          )
                        }
                        className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {detailBooking.status === "REPORT_DELIVERED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          detailBooking.id,
                          { action: "MARK_COMPLETED" },
                          "Marked Completed"
                        )
                      }
                      className="inline-flex items-center gap-1 rounded bg-[#16A34A] px-2.5 py-1 font-bold text-white"
                    >
                      Mark Completed
                    </button>
                  )}
                  {(ALLOWED_STATUS_TRANSITIONS[detailBooking.status] || []).length > 0 && (
                    <select
                      aria-label="Change booking status"
                      disabled={busy}
                      defaultValue=""
                      onChange={(e) => {
                        const target = e.target.value;
                        if (!target) return;
                        runAction(
                          detailBooking.id,
                          { action: "UPDATE_STATUS", status: target },
                          `Status updated to ${BOOKING_STATUS_META[target]?.label || target}`
                        );
                        e.target.value = "";
                      }}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-[#101B35]"
                    >
                      <option value="">Change Status...</option>
                      {(ALLOWED_STATUS_TRANSITIONS[detailBooking.status] || []).map((st) => (
                        <option key={st} value={st}>
                          → {BOOKING_STATUS_META[st]?.label || st}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            <BookingLifecycleTracker
              currentStatus={detailBooking.status}
              activities={detailBooking.activities || []}
            />
          </div>
        )}
      </Modal>

      {/* Manual Technician Assignment Modal */}
      <Modal
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        title={`Assign Technician — ${assignTarget?.bookingNumber || ""}`}
        description={
          assignTarget
            ? `${assignTarget.scheduledDate} (${assignTarget.timeSlotLabel}) • ${assignTarget.city}`
            : ""
        }
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {availableTechs.map((t) => {
              const selected = selectedTechId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTechId(t.id)}
                  className={`flex w-full items-center justify-between gap-4 rounded-xl border p-3.5 text-left transition ${
                    selected
                      ? "border-[#2563EB] bg-blue-50/50 ring-2 ring-[#2563EB]/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#101B35]">{t.name}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                        {t.technicianProfile?.employeeCode}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          t.technicianProfile?.availabilityStatus === "AVAILABLE"
                            ? "bg-green-50 text-[#16A34A]"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {t.technicianProfile?.availabilityStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {t.phone} • {t.technicianProfile?.serviceCity}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Specialties: {t.technicianProfile?.specialties}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-extrabold text-[#101B35]">{t.activeWorkloadCount} active</p>
                    <p className="text-[11px] text-slate-500">{t.completedCount} completed</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Assignment Dispatch Notes (Optional)
            </label>
            <input
              type="text"
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Any gate code, buyer instructions, or diagnostic focus..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignTarget(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !selectedTechId}
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Assigning..." : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Reschedule Modal */}
      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title={`Reschedule ${rescheduleTarget?.bookingNumber || ""}`}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <input
            type="date"
            min={getTodayDateStr()}
            value={rescheduleDate}
            onChange={(e) => {
              setRescheduleDate(e.target.value);
              loadSlots(e.target.value);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="space-y-2">
            {rescheduleSlots.map((sl) => (
              <button
                key={sl.id}
                type="button"
                disabled={!sl.isAvailable}
                onClick={() => setRescheduleSlotId(sl.id)}
                className={`flex w-full justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${
                  !sl.isAvailable
                    ? "bg-slate-100 text-slate-400"
                    : rescheduleSlotId === sl.id
                    ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span>{sl.label}</span>
                <span>{sl.isAvailable ? `${sl.remainingSpots} left` : "Full"}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRescheduleTarget(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !rescheduleSlotId}
              onClick={async () => {
                if (!rescheduleTarget) return;
                await runAction(
                  rescheduleTarget.id,
                  {
                    action: "RESCHEDULE",
                    scheduledDate: rescheduleDate,
                    slotId: rescheduleSlotId,
                  },
                  "Booking Rescheduled"
                );
                setRescheduleTarget(null);
              }}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Save Reschedule
            </button>
          </div>
        </div>
      </Modal>

      {/* Admin Reject Modal */}
      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title={`Reject Booking ${rejectTarget?.bookingNumber || ""}`}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejecting this booking..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || rejectReason.trim().length < 3}
              onClick={async () => {
                if (!rejectTarget) return;
                await runAction(
                  rejectTarget.id,
                  { action: "REJECT", reason: rejectReason },
                  "Booking Rejected"
                );
                setRejectTarget(null);
                setRejectReason("");
              }}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Reject Booking
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

