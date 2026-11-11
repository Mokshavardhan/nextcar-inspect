"use client";

import React, { useState } from "react";
import { Plus, Edit2, Power, Clock, RotateCcw } from "lucide-react";
import { formatCurrency, formatDateTime, parseChecklistSummary } from "@/lib/format";
import { PaymentStatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

export interface AdminServiceRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  durationMinutes: number;
  checklistSummary: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminPaymentRow {
  id: string;
  transactionId: string;
  gateway: string;
  paymentMode: string;
  amount: number;
  currency: string;
  status: string;
  refundAmount: number;
  refundReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  customer: { id: string; name: string; email: string; phone?: string | null };
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    service: { name: string };
  };
}

export function AdminServicesSection({
  services,
  onRefresh,
}: {
  services: AdminServiceRow[];
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminServiceRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 149,
    durationMinutes: 60,
    checklistText: "",
    sortOrder: 5,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: 149,
      durationMinutes: 60,
      checklistText:
        "Exterior body & paint inspection\nEngine bay & diagnostics scan\nRoad test & brake safety check\nDocuments verification",
      sortOrder: services.length + 1,
    });
    setModalOpen(true);
  };

  const openEdit = (svc: AdminServiceRow) => {
    setEditing(svc);
    setForm({
      name: svc.name,
      description: svc.description,
      price: svc.price,
      durationMinutes: svc.durationMinutes,
      checklistText: parseChecklistSummary(svc.checklistSummary).join("\n"),
      sortOrder: svc.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const checklistSummary = form.checklistText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const url = editing ? `/api/services/${editing.id}` : "/api/services";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: Number(form.price),
          durationMinutes: Number(form.durationMinutes),
          checklistSummary,
          sortOrder: Number(form.sortOrder),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save service");

      toast({
        type: "success",
        title: editing ? "Service Updated" : "Service Created",
      });
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      toast({
        type: "error",
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Could not save service",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (svc: AdminServiceRow) => {
    const res = await fetch(`/api/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !svc.isActive }),
    });
    if (res.ok) {
      toast({
        type: "info",
        title: `${svc.name} ${svc.isActive ? "Deactivated" : "Activated"}`,
      });
      await onRefresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#101B35]">
            Inspection Services & Pricing
          </h2>
          <p className="text-xs text-slate-500">
            Changes sync immediately to the homepage, services page, and customer booking wizard.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((svc) => {
          const bullets = parseChecklistSummary(svc.checklistSummary);
          return (
            <div
              key={svc.id}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm ${
                svc.isActive ? "border-slate-200" : "border-slate-200 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#101B35]">{svc.name}</h3>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        svc.isActive
                          ? "bg-green-50 text-[#16A34A]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {svc.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-[#101B35]">
                      {formatCurrency(svc.price)}
                    </p>
                    <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" /> {svc.durationMinutes}m
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-slate-600">{svc.description}</p>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-600">
                  {bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => openEdit(svc)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#101B35] hover:bg-slate-50"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Package
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(svc)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    svc.isActive
                      ? "border border-red-200 bg-red-50 text-[#DC2626]"
                      : "border border-green-200 bg-green-50 text-[#16A34A]"
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  {svc.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Create Inspection Service"}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Service Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Price (₹ INR) *
              </label>
              <input
                type="number"
                required
                min={1}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Duration (mins) *
              </label>
              <input
                type="number"
                required
                min={15}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Description *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Checklist Summary Bullets (one per line) *
            </label>
            <textarea
              required
              rows={4}
              value={form.checklistText}
              onChange={(e) => setForm({ ...form, checklistText: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-bold text-white"
            >
              {saving ? "Saving..." : "Save Service"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function AdminPaymentsSection({
  payments,
  onRefresh,
}: {
  payments: AdminPaymentRow[];
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [refundTarget, setRefundTarget] = useState<AdminPaymentRow | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/payments/${refundTarget.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundAmount, reason: refundReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");

      toast({ type: "success", title: "Refund Processed" });
      setRefundTarget(null);
      setRefundReason("");
      await onRefresh();
    } catch (err) {
      toast({
        type: "error",
        title: "Refund Error",
        description: err instanceof Error ? err.message : "Could not process refund",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold text-[#101B35]">Payment & Refund Ledger</h2>
        <p className="text-xs text-slate-500">
          Verified transaction IDs, booking references, payment status, and refund processing.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-[#F8FAFC] text-slate-600">
              <tr>
                <th className="px-4 py-3 font-bold">Transaction ID</th>
                <th className="px-4 py-3 font-bold">Booking Ref</th>
                <th className="px-4 py-3 font-bold">Customer</th>
                <th className="px-4 py-3 font-bold">Mode / Gateway</th>
                <th className="px-4 py-3 font-bold">Amount</th>
                <th className="px-4 py-3 font-bold">Refunded</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const canRefund =
                    (p.status === "PAID" || p.status === "PARTIALLY_REFUNDED") &&
                    p.amount - p.refundAmount > 0.01;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-[#101B35]">
                        {p.transactionId}
                        <p className="font-sans text-[11px] font-normal text-slate-400">
                          {formatDateTime(p.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold text-[#2563EB]">
                          {p.booking.bookingNumber}
                        </p>
                        <p className="text-[11px] text-slate-500">{p.booking.service.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#101B35]">{p.customer.name}</p>
                        <p className="text-[11px] text-slate-500">{p.customer.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#101B35]">{p.paymentMode}</span>
                        <p className="text-[11px] text-slate-500">{p.gateway}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#101B35]">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.refundAmount > 0 ? formatCurrency(p.refundAmount, p.currency) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canRefund && (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundTarget(p);
                              setRefundAmount(
                                Math.round((p.amount - p.refundAmount) * 100) / 100
                              );
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        title={`Process Refund — ${refundTarget?.transactionId || ""}`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleRefund} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Refund Amount (₹ INR) *
            </label>
            <input
              type="number"
              required
              min={0.01}
              step="0.01"
              max={refundTarget ? refundTarget.amount - refundTarget.refundAmount : undefined}
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Reason *</label>
            <textarea
              required
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason for full or partial refund..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRefundTarget(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white"
            >
              {busy ? "Processing..." : "Issue Refund"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

