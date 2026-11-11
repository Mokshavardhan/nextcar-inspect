"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Phone,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { DashboardShell, type NavTab } from "@/components/dashboard/DashboardShell";
import { BookingStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, getTodayDateStr } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";

interface TechBooking {
  id: string;
  bookingNumber: string;
  status: string;
  scheduledDate: string;
  timeSlotLabel: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  contactName: string;
  contactPhone: string;
  service: { name: string; durationMinutes: number };
  vehicle: {
    vehicleType: string;
    manufacturer: string;
    model: string;
    manufacturingYear: number;
    registrationNumber: string;
  };
  inspection?: {
    id: string;
    isDraft: boolean;
    revisionNotes?: string | null;
  } | null;
}

interface TechUser {
  id: string;
  name: string;
  email: string;
  technicianProfile?: {
    employeeCode: string;
    availabilityStatus: string;
    specialties: string;
  } | null;
}

export function TechnicianDashboardClient({ initialUser }: { initialUser: TechUser }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("assigned");
  const [bookings, setBookings] = useState<TechBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(
    initialUser.technicianProfile?.availabilityStatus || "AVAILABLE"
  );

  const loadAssigned = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      toast({ type: "error", title: "Unable to load assigned inspections" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAssigned();
  }, [loadAssigned]);

  const updateAvailability = async (status: string) => {
    setAvailability(status);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityStatus: status }),
    });
    if (res.ok) {
      toast({ type: "success", title: `Availability set to ${status}` });
    }
  };

  const todayStr = getTodayDateStr();
  const todaysBookings = bookings.filter(
    (b) =>
      b.scheduledDate === todayStr &&
      !["CANCELLED", "REJECTED"].includes(b.status)
  );
  const upcomingBookings = bookings.filter(
    (b) =>
      b.scheduledDate > todayStr &&
      !["CANCELLED", "REJECTED", "COMPLETED", "REPORT_DELIVERED", "APPROVED"].includes(b.status)
  );
  const pendingSubmissions = bookings.filter((b) =>
    ["TECHNICIAN_ASSIGNED", "INSPECTION_STARTED", "REVISION_REQUESTED"].includes(b.status)
  );
  const completedBookings = bookings.filter((b) =>
    ["INSPECTION_SUBMITTED", "UNDER_REVIEW", "APPROVED", "REPORT_DELIVERED", "COMPLETED"].includes(
      b.status
    )
  );

  const tabs: NavTab[] = [
    {
      id: "assigned",
      label: "Pending & Active",
      icon: <ClipboardList className="h-4 w-4" />,
      badge: pendingSubmissions.length,
    },
    {
      id: "today",
      label: "Today's Schedule",
      icon: <Clock className="h-4 w-4" />,
      badge: todaysBookings.length,
    },
    {
      id: "completed",
      label: "Submitted / Completed",
      icon: <CheckCircle2 className="h-4 w-4" />,
      badge: completedBookings.length,
    },
  ];

  const listToRender =
    activeTab === "today"
      ? todaysBookings
      : activeTab === "completed"
      ? completedBookings
      : pendingSubmissions.length > 0
      ? pendingSubmissions
      : bookings;

  return (
    <DashboardShell
      roleLabel={`Technician Portal (${initialUser.technicianProfile?.employeeCode || "FIELD"})`}
      userName={initialUser.name}
      userEmail={initialUser.email}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={
        <select
          value={availability}
          onChange={(e) => updateAvailability(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#101B35]"
          aria-label="Availability status"
        >
          <option value="AVAILABLE">Status: Available</option>
          <option value="BUSY">Status: Busy</option>
          <option value="OFF_DUTY">Status: Off Duty</option>
          <option value="ON_LEAVE">Status: On Leave</option>
        </select>
      }
    >
      {/* Mobile-First Overview Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Today&apos;s Inspections</p>
          <p className="mt-1 text-2xl font-extrabold text-[#101B35]">{todaysBookings.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Upcoming</p>
          <p className="mt-1 text-2xl font-extrabold text-[#2563EB]">{upcomingBookings.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Pending Submissions</p>
          <p className="mt-1 text-2xl font-extrabold text-[#F59E0B]">
            {pendingSubmissions.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Completed</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16A34A]">
            {completedBookings.length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : listToRender.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-bold text-[#101B35]">No Inspections in This View</h3>
          <p className="mt-1 text-sm text-slate-500">
            New vehicle inspections assigned by administration will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listToRender.map((b) => {
            const isRevision = b.status === "REVISION_REQUESTED";
            const mapHref =
              b.latitude && b.longitude
                ? `https://www.google.com/maps?q=${b.latitude},${b.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${b.address}, ${b.city}, ${b.state}`
                  )}`;

            return (
              <div
                key={b.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm ${
                  isRevision ? "border-orange-300 ring-2 ring-orange-100" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <span className="font-mono text-sm font-extrabold text-[#101B35]">
                      {b.bookingNumber}
                    </span>
                    <BookingStatusBadge status={b.status} />
                  </div>

                  {isRevision && b.inspection?.revisionNotes && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-xs text-orange-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                      <div>
                        <p className="font-bold">Revision Requested by Admin:</p>
                        <p>{b.inspection.revisionNotes}</p>
                      </div>
                    </div>
                  )}

                  <h3 className="mt-3 text-base font-bold text-[#101B35]">{b.service.name}</h3>

                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 shrink-0 text-[#2563EB]" />
                      <span className="font-semibold text-[#101B35]">
                        {b.vehicle.manufacturingYear} {b.vehicle.manufacturer} {b.vehicle.model}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-[#101B35]">
                        {b.vehicle.registrationNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-[#2563EB]" />
                      <span>
                        {formatDate(b.scheduledDate)} • <strong>{b.timeSlotLabel}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-[#2563EB]" />
                      <span>
                        Customer: <strong>{b.contactName}</strong> ({b.contactPhone})
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                        <span>
                          {b.address}, {b.city}, {b.state} {b.postalCode}
                        </span>
                      </div>
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#2563EB] hover:underline"
                      >
                        Map
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <Link
                    href={`/dashboard/technician/inspections/${b.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    {["TECHNICIAN_ASSIGNED", "RESCHEDULED"].includes(b.status)
                      ? "Open & Start Inspection"
                      : ["INSPECTION_STARTED", "REVISION_REQUESTED"].includes(b.status)
                      ? "Continue Inspection Checklist"
                      : "View Submitted Inspection"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

