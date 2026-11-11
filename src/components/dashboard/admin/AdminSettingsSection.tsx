"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, Mail, MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";

interface SettingsData {
  companyName: string;
  companyTagline: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  allowFullPayment: boolean;
  allowAdvancePayment: boolean;
  advancePercentage: number;
  allowPayLater: boolean;
  cancellationWindowHours: number;
  rescheduleWindowHours: number;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
}

interface SlotItem {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  maxBookingsPerSlot: number;
  isActive: boolean;
}

interface BlockedDateItem {
  id: string;
  dateStr: string;
  reason?: string | null;
}

interface DispatchLogItem {
  id: string;
  channel: string;
  eventType: string;
  recipientAddress?: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

interface InquiryItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export function AdminSettingsSection({
  initialSettings,
  slots,
  blockedDates,
  integrations,
  dispatchLogs,
  inquiries,
  onRefresh,
}: {
  initialSettings: SettingsData;
  slots: SlotItem[];
  blockedDates: BlockedDateItem[];
  integrations: {
    stripeConfigured: boolean;
    smtpConfigured: boolean;
    whatsappConfigured: boolean;
  };
  dispatchLogs: DispatchLogItem[];
  inquiries: InquiryItem[];
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  const [newSlot, setNewSlot] = useState({
    label: "",
    startTime: "18:00",
    endTime: "19:30",
    maxBookingsPerSlot: 2,
  });
  const [blockDateStr, setBlockDateStr] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const patchSettings = async (payload: Record<string, unknown>, message: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast({ type: "success", title: message });
      await onRefresh();
    } catch (err) {
      toast({
        type: "error",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not update settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const resolveInquiry = async (id: string) => {
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "RESOLVED" }),
    });
    toast({ type: "success", title: "Inquiry Marked Resolved" });
    await onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* Platform Payment & Policy Settings */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          patchSettings(form as unknown as Record<string, unknown>, "Platform settings saved");
        }}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
      >
        <div>
          <h2 className="text-lg font-extrabold text-[#101B35]">
            Payment Modes, Booking Policies & Company Profile
          </h2>
          <p className="text-xs text-slate-500">
            Controls available checkout modes in Step 6, cancellation/reschedule deadlines, and PDF
            header details.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Company Name</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Support Email</label>
            <input
              type="email"
              value={form.companyEmail}
              onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Support Phone</label>
            <input
              type="text"
              value={form.companyPhone}
              onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Company Address
            </label>
            <input
              type="text"
              value={form.companyAddress}
              onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.allowFullPayment}
              onChange={(e) => setForm({ ...form, allowFullPayment: e.target.checked })}
            />
            Allow Full Online Payment
          </label>
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.allowAdvancePayment}
              onChange={(e) => setForm({ ...form, allowAdvancePayment: e.target.checked })}
            />
            Allow Partial Advance Payment
          </label>
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.allowPayLater}
              onChange={(e) => setForm({ ...form, allowPayLater: e.target.checked })}
            />
            Allow Pay Later Option
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Advance Deposit (%)
            </label>
            <input
              type="number"
              min={5}
              max={95}
              value={form.advancePercentage}
              onChange={(e) => setForm({ ...form, advancePercentage: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Cancellation Cutoff (Hours)
            </label>
            <input
              type="number"
              min={0}
              value={form.cancellationWindowHours}
              onChange={(e) =>
                setForm({ ...form, cancellationWindowHours: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Reschedule Cutoff (Hours)
            </label>
            <input
              type="number"
              min={0}
              value={form.rescheduleWindowHours}
              onChange={(e) =>
                setForm({ ...form, rescheduleWindowHours: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
              Payments: {integrations.stripeConfigured ? "Live Stripe" : "Sandbox Card Gateway"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
              Email: {integrations.smtpConfigured ? "Live SMTP" : "Local Dispatch Log"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
              WhatsApp: {integrations.whatsappConfigured ? "Live API" : "Local Dispatch Log"}
            </span>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save Platform Settings"}
          </button>
        </div>
      </form>

      {/* Availability Slots & Blocked Dates */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7 space-y-4">
          <h3 className="text-base font-bold text-[#101B35]">Time Slots & Capacity</h3>
          <div className="space-y-2">
            {slots.map((sl) => (
              <div
                key={sl.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs"
              >
                <div>
                  <p className="font-bold text-[#101B35]">{sl.label}</p>
                  <p className="text-slate-500">
                    {sl.startTime} – {sl.endTime} • Max {sl.maxBookingsPerSlot} bookings/slot
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => patchSettings({ toggleSlotId: sl.id }, "Slot status updated")}
                  className={`rounded-lg px-3 py-1 font-bold ${
                    sl.isActive
                      ? "bg-green-50 text-[#16A34A]"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {sl.isActive ? "Active" : "Disabled"}
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <input
              type="text"
              value={newSlot.label}
              onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })}
              placeholder="06:00 PM - 07:30 PM"
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs sm:col-span-2"
            />
            <input
              type="number"
              min={1}
              value={newSlot.maxBookingsPerSlot}
              onChange={(e) =>
                setNewSlot({ ...newSlot, maxBookingsPerSlot: Number(e.target.value) })
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              title="Capacity"
            />
            <button
              type="button"
              disabled={!newSlot.label.trim()}
              onClick={() => {
                patchSettings({ addSlot: newSlot }, "Time slot added");
                setNewSlot({ ...newSlot, label: "" });
              }}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#101B35] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add Slot
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5 space-y-4">
          <h3 className="text-base font-bold text-[#101B35]">Blocked Holiday Dates</h3>
          <div className="flex gap-2">
            <input
              type="date"
              value={blockDateStr}
              onChange={(e) => setBlockDateStr(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Holiday / Maintenance"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
            <button
              type="button"
              disabled={!blockDateStr}
              onClick={() => {
                patchSettings(
                  { addBlockedDate: { dateStr: blockDateStr, reason: blockReason } },
                  "Date blocked"
                );
                setBlockDateStr("");
                setBlockReason("");
              }}
              className="rounded-lg bg-[#DC2626] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Block
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {blockedDates.length === 0 ? (
              <p className="text-xs text-slate-500">No blocked dates configured.</p>
            ) : (
              blockedDates.map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <span>
                    <strong>{bd.dateStr}</strong> {bd.reason ? `— ${bd.reason}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      patchSettings({ removeBlockedDateId: bd.id }, "Blocked date removed")
                    }
                    className="text-slate-400 hover:text-[#DC2626]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Email & WhatsApp Dispatch Log + Contact Inquiries */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
          <h3 className="text-base font-bold text-[#101B35]">
            Email & WhatsApp Notification Dispatch Log
          </h3>
          <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto pr-1">
            {dispatchLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No external notifications dispatched yet.</p>
            ) : (
              dispatchLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#101B35]">
                      {log.channel === "EMAIL" ? (
                        <Mail className="h-3.5 w-3.5 text-[#2563EB]" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 text-[#16A34A]" />
                      )}
                      {log.channel} → {log.recipientAddress}
                    </span>
                    <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-slate-700">{log.subject}</p>
                  <p className="mt-0.5 text-slate-500 line-clamp-2">{log.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <h3 className="text-base font-bold text-[#101B35]">Contact Inquiries</h3>
          <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto pr-1">
            {inquiries.length === 0 ? (
              <p className="text-xs text-slate-500">No customer contact inquiries yet.</p>
            ) : (
              inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#101B35]">{inq.subject}</span>
                    {inq.status === "NEW" ? (
                      <button
                        type="button"
                        onClick={() => resolveInquiry(inq.id)}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2563EB]"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Resolve
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-[#16A34A]">RESOLVED</span>
                    )}
                  </div>
                  <p className="mt-1 text-slate-600">{inq.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {inq.name} ({inq.email}) • {formatDateTime(inq.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

