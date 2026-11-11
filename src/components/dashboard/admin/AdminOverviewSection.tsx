"use client";

import React from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldAlert,
  UserCheck,
  TrendingUp,
  Star,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { BOOKING_STATUS_META } from "@/lib/constants";

export interface AdminOverviewData {
  metrics: {
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    assignedInspections: number;
    underReviewCount: number;
    completedInspections: number;
    totalRevenue: number;
    overdueCount: number;
    openInquiries: number;
  };
  statusCounts: Record<string, number>;
  trend: Array<{ date: string; label: string; bookings: number; revenue: number }>;
  recentActivities: Array<{
    id: string;
    action: string;
    toStatus?: string | null;
    details?: string | null;
    actorRole: string;
    createdAt: string;
    actor?: { name: string; role: string } | null;
    booking: { id: string; bookingNumber: string };
  }>;
  techPerformance: Array<{
    id: string;
    name: string;
    isActive: boolean;
    availabilityStatus: string;
    rating: number;
    activeCount: number;
    completedCount: number;
  }>;
}

export function AdminOverviewSection({
  data,
  onNavigateTab,
}: {
  data: AdminOverviewData;
  onNavigateTab: (tab: string) => void;
}) {
  const m = data.metrics;
  const maxBookings = Math.max(1, ...data.trend.map((d) => d.bookings));

  const kpiCards = [
    {
      label: "Total Bookings",
      value: String(m.totalBookings),
      icon: Calendar,
      accent: "text-[#101B35] bg-slate-100",
    },
    {
      label: "Pending Bookings",
      value: String(m.pendingBookings),
      icon: Clock,
      accent: "text-[#F59E0B] bg-amber-50",
    },
    {
      label: "Confirmed Bookings",
      value: String(m.confirmedBookings),
      icon: CheckCircle2,
      accent: "text-[#2563EB] bg-blue-50",
    },
    {
      label: "Assigned Inspections",
      value: String(m.assignedInspections),
      icon: UserCheck,
      accent: "text-indigo-700 bg-indigo-50",
    },
    {
      label: "Completed Inspections",
      value: String(m.completedInspections),
      icon: TrendingUp,
      accent: "text-[#16A34A] bg-green-50",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(m.totalRevenue),
      icon: DollarSign,
      accent: "text-[#101B35] bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      {m.overdueCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#F59E0B]" />
            <span>
              <strong>{m.overdueCount} inspection(s)</strong> are past their scheduled date without
              completion.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("bookings")}
            className="font-bold text-[#101B35] underline"
          >
            Review Bookings
          </button>
        </div>
      )}

      {/* 6 KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                <div className={`rounded-lg p-1.5 ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#101B35]">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Row */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#101B35]">7-Day Booking Volume</h3>
              <p className="text-xs text-slate-500">Daily booking intake and revenue trend</p>
            </div>
            {m.underReviewCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab("reviews")}
                className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100"
              >
                {m.underReviewCount} Ready for QC Review →
              </button>
            )}
          </div>

          <div className="mt-6 grid h-48 grid-cols-7 items-end gap-3">
            {data.trend.map((day) => {
              const heightPct = Math.max(8, Math.round((day.bookings / maxBookings) * 100));
              return (
                <div key={day.date} className="flex h-full flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-bold text-[#101B35]">{day.bookings}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-[#2563EB] transition-all"
                      style={{ height: `${heightPct}%` }}
                      title={`${day.date}: ${day.bookings} booking(s), ${formatCurrency(day.revenue)}`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-slate-600">{day.label}</p>
                    <p className="text-[10px] text-slate-400">
                      {day.revenue > 0 ? `₹${Math.round(day.revenue).toLocaleString("en-IN")}` : "-"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <h3 className="text-base font-bold text-[#101B35]">Status Distribution</h3>
          <p className="text-xs text-slate-500">Live workflow breakdown across all bookings</p>
          <div className="mt-4 space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {Object.entries(data.statusCounts).length === 0 ? (
              <p className="text-sm text-slate-500">No bookings recorded yet.</p>
            ) : (
              Object.entries(data.statusCounts).map(([status, count]) => {
                const meta = BOOKING_STATUS_META[status];
                const pct =
                  m.totalBookings > 0 ? Math.round((count / m.totalBookings) * 100) : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#101B35]">
                        {meta?.label || status}
                      </span>
                      <span className="font-bold text-slate-600">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#101B35]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Technician Performance & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#101B35]">Technician Performance</h3>
            <button
              type="button"
              onClick={() => onNavigateTab("technicians")}
              className="text-xs font-bold text-[#2563EB] hover:underline"
            >
              Manage Roster
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="pb-2 font-semibold">Technician</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Active</th>
                  <th className="pb-2 font-semibold">Completed</th>
                  <th className="pb-2 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.techPerformance.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 font-bold text-[#101B35]">{t.name}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          !t.isActive
                            ? "bg-slate-100 text-slate-500"
                            : t.availabilityStatus === "AVAILABLE"
                            ? "bg-green-50 text-[#16A34A]"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {t.isActive ? t.availabilityStatus : "INACTIVE"}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold">{t.activeCount}</td>
                    <td className="py-2.5 font-semibold text-[#16A34A]">{t.completedCount}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 font-bold">
                        <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        {t.rating.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-6">
          <h3 className="text-base font-bold text-[#101B35]">Recent Activity Feed</h3>
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {data.recentActivities.map((act) => (
              <div
                key={act.id}
                className="rounded-xl border border-slate-100 bg-[#F8FAFC] px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#101B35]">
                    {act.booking.bookingNumber} • {act.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDateTime(act.createdAt)}
                  </span>
                </div>
                {act.details && <p className="mt-0.5 text-slate-600">{act.details}</p>}
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {act.actor?.name || "System"} ({act.actorRole})
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

