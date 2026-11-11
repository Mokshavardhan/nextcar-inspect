"use client";

import React, { useState } from "react";
import { Plus, Edit2, Power, Star, Phone, Mail, MapPin, ClipboardList } from "lucide-react";
import type { AdminTechnicianRow } from "@/components/dashboard/admin/AdminBookingsSection";
import { BookingStatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";

export function AdminTechniciansSection({
  technicians,
  onRefresh,
}: {
  technicians: AdminTechnicianRow[];
  onRefresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<AdminTechnicianRow | null>(null);
  const [workloadTech, setWorkloadTech] = useState<AdminTechnicianRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    employeeCode: "",
    specialties: "",
    serviceCity: "",
    availabilityStatus: "AVAILABLE" as "AVAILABLE" | "BUSY" | "OFF_DUTY" | "ON_LEAVE",
  });

  const openCreate = () => {
    setEditingTech(null);
    setForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      employeeCode: `TECH-${Math.floor(103 + Math.random() * 800)}`,
      specialties: "Pre-Purchase Diagnostics, Engine & Mechanical",
      serviceCity: "Bengaluru, Karnataka",
      availabilityStatus: "AVAILABLE",
    });
    setModalOpen(true);
  };

  const openEdit = (t: AdminTechnicianRow) => {
    setEditingTech(t);
    setForm({
      name: t.name,
      email: t.email,
      password: "",
      phone: t.phone || "",
      employeeCode: t.technicianProfile?.employeeCode || "",
      specialties: t.technicianProfile?.specialties || "",
      serviceCity: t.technicianProfile?.serviceCity || "",
      availabilityStatus: (t.technicianProfile?.availabilityStatus || "AVAILABLE") as
        | "AVAILABLE"
        | "BUSY"
        | "OFF_DUTY"
        | "ON_LEAVE",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingTech ? `/api/technicians/${editingTech.id}` : "/api/technicians";
      const method = editingTech ? "PATCH" : "POST";
      const payload = editingTech
        ? {
            name: form.name,
            phone: form.phone,
            specialties: form.specialties,
            serviceCity: form.serviceCity,
            availabilityStatus: form.availabilityStatus,
            ...(form.password ? { newPassword: form.password } : {}),
          }
        : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operation failed");

      toast({
        type: "success",
        title: editingTech ? "Technician Updated" : "Technician Added",
      });
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      toast({
        type: "error",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not save technician",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: AdminTechnicianRow) => {
    const res = await fetch(`/api/technicians/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    if (res.ok) {
      toast({
        type: "info",
        title: `${t.name} ${t.isActive ? "Deactivated" : "Activated"}`,
      });
      await onRefresh();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#101B35]">Technician Roster & Performance</h2>
          <p className="text-xs text-slate-500">
            Manage inspector accounts, service cities, availability, and workload.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Technician
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {technicians.map((t) => (
          <div
            key={t.id}
            className={`rounded-2xl border bg-white p-5 shadow-sm ${
              t.isActive ? "border-slate-200" : "border-slate-200 opacity-65"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#101B35]">{t.name}</h3>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                    {t.technicianProfile?.employeeCode}
                  </span>
                </div>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    !t.isActive
                      ? "bg-red-50 text-[#DC2626]"
                      : t.technicianProfile?.availabilityStatus === "AVAILABLE"
                      ? "bg-green-50 text-[#16A34A]"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {t.isActive ? t.technicianProfile?.availabilityStatus : "DEACTIVATED"}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-[#101B35]">
                <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                {(t.technicianProfile?.rating || 5.0).toFixed(1)}
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {t.email}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {t.phone || "-"}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {t.technicianProfile?.serviceCity}
              </p>
              <p className="pt-1 text-[11px] text-slate-500">
                {t.technicianProfile?.specialties}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#F8FAFC] p-3 text-center text-xs">
              <div>
                <p className="font-extrabold text-[#2563EB]">{t.activeWorkloadCount}</p>
                <p className="text-[11px] text-slate-500">Assigned Active</p>
              </div>
              <div>
                <p className="font-extrabold text-[#16A34A]">{t.completedCount}</p>
                <p className="text-[11px] text-slate-500">Completed</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setWorkloadTech(t)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] hover:bg-blue-100"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Inspections
              </button>
              <button
                type="button"
                onClick={() => openEdit(t)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#101B35] hover:bg-slate-50"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => toggleActive(t)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  t.isActive
                    ? "border border-red-200 bg-red-50 text-[#DC2626]"
                    : "border border-green-200 bg-green-50 text-[#16A34A]"
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                {t.isActive ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTech ? `Edit ${editingTech.name}` : "Add New Technician"}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Employee Code *
            </label>
            <input
              type="text"
              required
              disabled={Boolean(editingTech)}
              value={form.employeeCode}
              onChange={(e) => setForm({ ...form, employeeCode: e.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Email *</label>
            <input
              type="email"
              required
              disabled={Boolean(editingTech)}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {editingTech ? "Reset Password (Optional)" : "Password *"}
            </label>
            <input
              type="password"
              required={!editingTech}
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editingTech ? "Leave blank to keep" : "Min 6 chars"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Phone *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Availability Status
            </label>
            <select
              value={form.availabilityStatus}
              onChange={(e) =>
                setForm({
                  ...form,
                  availabilityStatus: e.target.value as
                    | "AVAILABLE"
                    | "BUSY"
                    | "OFF_DUTY"
                    | "ON_LEAVE",
                })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="BUSY">BUSY</option>
              <option value="OFF_DUTY">OFF_DUTY</option>
              <option value="ON_LEAVE">ON_LEAVE</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Service City / Region *
            </label>
            <input
              type="text"
              required
              value={form.serviceCity}
              onChange={(e) => setForm({ ...form, serviceCity: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Specialties *
            </label>
            <input
              type="text"
              required
              value={form.specialties}
              onChange={(e) => setForm({ ...form, specialties: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
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
              {saving ? "Saving..." : editingTech ? "Save Technician" : "Add Technician"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Technician Assigned & Completed Inspections Modal */}
      <Modal
        open={Boolean(workloadTech)}
        onClose={() => setWorkloadTech(null)}
        title={`Inspection Workload — ${workloadTech?.name || ""}`}
        description={
          workloadTech
            ? `${workloadTech.technicianProfile?.employeeCode || ""} • ${workloadTech.activeWorkloadCount} active, ${workloadTech.completedCount} completed`
            : ""
        }
        maxWidthClass="max-w-2xl"
      >
        {workloadTech && (
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Assigned Active Inspections ({workloadTech.activeBookings?.length || 0})
              </h4>
              <div className="mt-2 space-y-2">
                {(workloadTech.activeBookings || []).length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    No active inspections assigned.
                  </p>
                ) : (
                  (workloadTech.activeBookings || []).map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs"
                    >
                      <div>
                        <p className="font-mono font-bold text-[#101B35]">{b.bookingNumber}</p>
                        {b.vehicle && (
                          <p className="text-slate-600">
                            {b.vehicle.manufacturingYear} {b.vehicle.manufacturer} {b.vehicle.model} (
                            {b.vehicle.registrationNumber})
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          {formatDate(b.scheduledDate)} • {b.timeSlotLabel} • {b.city}
                        </p>
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#16A34A]">
                Completed Inspections ({workloadTech.completedBookings?.length || 0})
              </h4>
              <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
                {(workloadTech.completedBookings || []).length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    No completed inspections yet.
                  </p>
                ) : (
                  (workloadTech.completedBookings || []).map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs"
                    >
                      <div>
                        <p className="font-mono font-bold text-[#101B35]">{b.bookingNumber}</p>
                        {b.vehicle && (
                          <p className="text-slate-600">
                            {b.vehicle.manufacturingYear} {b.vehicle.manufacturer} {b.vehicle.model} (
                            {b.vehicle.registrationNumber})
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          {formatDate(b.scheduledDate)} • {b.timeSlotLabel}
                        </p>
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

