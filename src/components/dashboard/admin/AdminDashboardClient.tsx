"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  CreditCard,
  FileCheck2,
  Package,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { DashboardShell, type NavTab } from "@/components/dashboard/DashboardShell";
import {
  AdminOverviewSection,
  type AdminOverviewData,
} from "@/components/dashboard/admin/AdminOverviewSection";
import {
  AdminBookingsSection,
  type AdminBookingRow,
  type AdminTechnicianRow,
} from "@/components/dashboard/admin/AdminBookingsSection";
import { AdminTechniciansSection } from "@/components/dashboard/admin/AdminTechniciansSection";
import {
  AdminPaymentsSection,
  AdminServicesSection,
  type AdminPaymentRow,
  type AdminServiceRow,
} from "@/components/dashboard/admin/AdminServicesPaymentsSection";
import { AdminSettingsSection } from "@/components/dashboard/admin/AdminSettingsSection";
import { useToast } from "@/components/ui/ToastProvider";

interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export function AdminDashboardClient({ initialUser }: { initialUser: AdminUser }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [technicians, setTechnicians] = useState<AdminTechnicianRow[]>([]);
  const [services, setServices] = useState<AdminServiceRow[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settingsBundle, setSettingsBundle] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inquiries, setInquiries] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [ovRes, bkRes, techRes, svcRes, payRes, setRes, logRes, inqRes] =
        await Promise.all([
          fetch("/api/admin/overview", { cache: "no-store" }),
          fetch("/api/bookings", { cache: "no-store" }),
          fetch("/api/technicians", { cache: "no-store" }),
          fetch("/api/services?all=true", { cache: "no-store" }),
          fetch("/api/payments", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
          fetch("/api/notifications?logs=true", { cache: "no-store" }),
          fetch("/api/admin/inquiries", { cache: "no-store" }),
        ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (bkRes.ok) setBookings((await bkRes.json()).bookings || []);
      if (techRes.ok) setTechnicians((await techRes.json()).technicians || []);
      if (svcRes.ok) setServices((await svcRes.json()).services || []);
      if (payRes.ok) setPayments((await payRes.json()).payments || []);
      if (setRes.ok) setSettingsBundle(await setRes.json());
      if (logRes.ok) setDispatchLogs((await logRes.json()).dispatchLogs || []);
      if (inqRes.ok) setInquiries((await inqRes.json()).inquiries || []);
    } catch {
      toast({ type: "error", title: "Failed to refresh admin console data" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const reviewQueueCount = bookings.filter((b) =>
    ["INSPECTION_SUBMITTED", "UNDER_REVIEW"].includes(b.status)
  ).length;
  const assignQueueCount = bookings.filter((b) =>
    ["PENDING", "CONFIRMED", "RESCHEDULED"].includes(b.status)
  ).length;

  const tabs: NavTab[] = [
    { id: "overview", label: "Dashboard Overview", icon: <BarChart3 className="h-4 w-4" /> },
    {
      id: "bookings",
      label: "All Bookings",
      icon: <Calendar className="h-4 w-4" />,
      badge: bookings.length,
    },
    {
      id: "assignments",
      label: "Assign Technicians",
      icon: <UserPlus className="h-4 w-4" />,
      badge: assignQueueCount,
    },
    {
      id: "reviews",
      label: "Inspection Reviews",
      icon: <FileCheck2 className="h-4 w-4" />,
      badge: reviewQueueCount,
    },
    { id: "technicians", label: "Technicians", icon: <Users className="h-4 w-4" /> },
    { id: "services", label: "Services & Pricing", icon: <Package className="h-4 w-4" /> },
    { id: "payments", label: "Payments & Refunds", icon: <CreditCard className="h-4 w-4" /> },
    { id: "settings", label: "Availability & Logs", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <DashboardShell
      roleLabel="Administrator Console"
      userName={initialUser.name}
      userEmail={initialUser.email}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
      ) : (
        <>
          {activeTab === "overview" && overview && (
            <AdminOverviewSection data={overview} onNavigateTab={setActiveTab} />
          )}

          {activeTab === "bookings" && (
            <AdminBookingsSection
              bookings={bookings}
              technicians={technicians}
              onRefresh={loadAll}
              mode="all"
            />
          )}

          {activeTab === "assignments" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#101B35]">
                  Manual Technician Assignment Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Review incoming bookings, inspect technician availability & workload, and dispatch
                  the ideal specialist.
                </p>
              </div>
              <AdminBookingsSection
                bookings={bookings}
                technicians={technicians}
                onRefresh={loadAll}
                mode="assign"
              />
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#101B35]">
                  Inspection Quality Review & PDF Approval
                </h2>
                <p className="text-xs text-slate-500">
                  Click &ldquo;Review&rdquo; on any submitted inspection to audit checklist
                  responses, photos, request revisions, or approve and issue the official PDF report.
                </p>
              </div>
              <AdminBookingsSection
                bookings={bookings}
                technicians={technicians}
                onRefresh={loadAll}
                mode="reviews"
              />
            </div>
          )}

          {activeTab === "technicians" && (
            <AdminTechniciansSection technicians={technicians} onRefresh={loadAll} />
          )}

          {activeTab === "services" && (
            <AdminServicesSection services={services} onRefresh={loadAll} />
          )}

          {activeTab === "payments" && (
            <AdminPaymentsSection payments={payments} onRefresh={loadAll} />
          )}

          {activeTab === "settings" && settingsBundle && (
            <AdminSettingsSection
              initialSettings={settingsBundle.settings}
              slots={settingsBundle.slots || []}
              blockedDates={settingsBundle.blockedDates || []}
              integrations={
                settingsBundle.integrations || {
                  stripeConfigured: false,
                  smtpConfigured: false,
                  whatsappConfigured: false,
                }
              }
              dispatchLogs={dispatchLogs}
              inquiries={inquiries}
              onRefresh={loadAll}
            />
          )}
        </>
      )}
    </DashboardShell>
  );
}

