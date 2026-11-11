"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  RotateCcw,
  XCircle,
  Eye,
} from "lucide-react";
import { BookingStatusBadge, RatingBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";

interface CategoryTree {
  id: string;
  code: string;
  name: string;
  items: Array<{ id: string; code: string; label: string }>;
}

interface ReviewBookingData {
  id: string;
  bookingNumber: string;
  status: string;
  scheduledDate: string;
  timeSlotLabel: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  service: { name: string };
  vehicle: {
    vehicleType: string;
    manufacturer: string;
    model: string;
    manufacturingYear: number;
    registrationNumber: string;
    fuelType: string;
    transmissionType: string;
  };
  inspection: {
    id: string;
    overallCondition?: string | null;
    observations?: string | null;
    comments?: string | null;
    criticalIssues?: string | null;
    recommendations?: string | null;
    finalAssessment?: string | null;
    revisionNotes?: string | null;
    technician: {
      name: string;
      email: string;
      phone?: string | null;
      technicianProfile?: { employeeCode: string } | null;
    };
    responses: Array<{
      checklistItemId: string;
      rating: string;
      notes?: string | null;
    }>;
    media: Array<{
      id: string;
      mediaType: string;
      originalName: string;
      categoryTag?: string | null;
      caption?: string | null;
    }>;
  };
  report?: {
    id: string;
    reportNumber: string;
    isApproved: boolean;
  } | null;
}

export function AdminInspectionReviewClient({
  booking,
  categories,
}: {
  booking: ReviewBookingData;
  categories: CategoryTree[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [recommendations, setRecommendations] = useState(
    booking.inspection.recommendations || ""
  );
  const [finalAssessment, setFinalAssessment] = useState(
    booking.inspection.finalAssessment || ""
  );

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [lightboxMediaId, setLightboxMediaId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const responseMap = new Map(
    booking.inspection.responses.map((r) => [r.checklistItemId, r])
  );

  const photos = booking.inspection.media.filter((m) => m.mediaType === "PHOTO");
  const docs = booking.inspection.media.filter((m) => m.mediaType === "DOCUMENT");

  const handleApproveAndGenerate = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "APPROVE",
          recommendations,
          finalAssessment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      toast({
        type: "success",
        title: `Report ${data.report?.reportNumber || ""} Approved & Delivered!`,
        description: "Customer can now download the certified PDF report.",
      });
      router.refresh();
    } catch (err) {
      toast({
        type: "error",
        title: "Approval Failed",
        description: err instanceof Error ? err.message : "Could not approve inspection",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "REQUEST_REVISION",
          revisionNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      toast({
        type: "info",
        title: "Revision Requested",
        description: "Technician has been notified to submit corrections.",
      });
      setRevisionModalOpen(false);
      router.push("/dashboard/admin");
      router.refresh();
    } catch (err) {
      toast({
        type: "error",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not request revision",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "REJECT",
          reason: rejectReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reject failed");

      toast({ type: "info", title: "Inspection Rejected" });
      setRejectModalOpen(false);
      router.push("/dashboard/admin");
      router.refresh();
    } catch (err) {
      toast({
        type: "error",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not reject inspection",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#101B35] px-4 py-3.5 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold">{booking.bookingNumber}</span>
                <BookingStatusBadge status={booking.status} />
                <RatingBadge rating={booking.inspection.overallCondition} />
              </div>
              <p className="text-xs text-slate-300">
                QC Inspection Review • {booking.vehicle.manufacturingYear}{" "}
                {booking.vehicle.manufacturer} {booking.vehicle.model} (
                {booking.vehicle.registrationNumber})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/bookings/${booking.id}/report?preview=1`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview PDF
            </a>
            {booking.report?.isApproved && (
              <a
                href={`/api/bookings/${booking.id}/report`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3.5 py-2 text-xs font-bold text-white hover:bg-green-700"
              >
                <Download className="h-3.5 w-3.5" />
                Download Certified PDF
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {/* Top Metadata Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-sm">
            <p className="font-bold uppercase tracking-wider text-slate-400">Customer & Site</p>
            <p className="mt-2 text-sm font-bold text-[#101B35]">{booking.contactName}</p>
            <p className="text-slate-600">{booking.contactEmail}</p>
            <p className="text-slate-600">{booking.contactPhone}</p>
            <p className="mt-2 text-slate-500">
              {booking.address}, {booking.city}, {booking.state}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-sm">
            <p className="font-bold uppercase tracking-wider text-slate-400">Vehicle & Package</p>
            <p className="mt-2 text-sm font-bold text-[#101B35]">
              {booking.vehicle.manufacturingYear} {booking.vehicle.manufacturer}{" "}
              {booking.vehicle.model}
            </p>
            <p className="font-mono font-bold text-[#2563EB]">
              {booking.vehicle.registrationNumber}
            </p>
            <p className="mt-1 text-slate-600">
              {booking.vehicle.vehicleType} • {booking.vehicle.fuelType} •{" "}
              {booking.vehicle.transmissionType}
            </p>
            <p className="mt-1 font-semibold text-slate-700">{booking.service.name}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-sm">
            <p className="font-bold uppercase tracking-wider text-slate-400">Inspector & Slot</p>
            <p className="mt-2 text-sm font-bold text-[#101B35]">
              {booking.inspection.technician.name}
            </p>
            <p className="font-mono text-slate-500">
              {booking.inspection.technician.technicianProfile?.employeeCode || "CERTIFIED"}
            </p>
            <p className="mt-2 text-slate-600">
              {formatDate(booking.scheduledDate)} ({booking.timeSlotLabel})
            </p>
            {booking.report && (
              <p className="mt-1 font-bold text-[#16A34A]">
                Report ID: {booking.report.reportNumber}
              </p>
            )}
          </div>
        </div>

        {/* Checklist Review by Category */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-[#101B35]">
            Technician Checklist Submissions (26 Checkpoints)
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="border-b border-slate-100 pb-3 text-sm font-extrabold text-[#101B35]">
                  {cat.name}
                </h3>
                <div className="mt-3 divide-y divide-slate-100">
                  {cat.items.map((item) => {
                    const resp = responseMap.get(item.id);
                    return (
                      <div key={item.id} className="py-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#172033]">{item.label}</span>
                          <RatingBadge rating={resp?.rating} />
                        </div>
                        {resp?.notes && (
                          <p className="mt-1 text-[11px] text-slate-500">Note: {resp.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Uploaded Photos & Documents */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#101B35]">
            Uploaded Vehicle Photographs ({photos.length}) & Documents ({docs.length})
          </h2>
          {photos.length === 0 && docs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No photographs or supporting documents were attached to this submission.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {photos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setLightboxMediaId(p.id)}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-[#F8FAFC] text-left transition hover:border-blue-300"
                    >
                      <img
                        src={`/api/media/${p.id}`}
                        alt={p.caption || p.originalName}
                        className="h-36 w-full object-cover"
                      />
                      <div className="p-2.5 text-xs">
                        <p className="font-bold text-[#101B35]">{p.categoryTag || "Photo"}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {p.caption || p.originalName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {docs.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {docs.map((d) => (
                    <a
                      key={d.id}
                      href={`/api/media/${d.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-[#2563EB] hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4" />
                      {d.originalName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Technician Observations & Admin Approval Controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-[#101B35]">
            Observations, Critical Issues & Quality Certification
          </h2>

          <div className="grid gap-4 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-[#F8FAFC] p-4">
              <p className="font-bold uppercase text-slate-500">Technician Observations</p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-[#172033]">
                {booking.inspection.observations || "None provided."}
              </p>
            </div>
            <div className="rounded-xl bg-red-50/70 p-4 border border-red-100">
              <p className="font-bold uppercase text-[#DC2626]">Critical Issues Reported</p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-[#172033]">
                {booking.inspection.criticalIssues || "None reported."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Recommendations (Included on Official PDF)
              </label>
              <textarea
                rows={3}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Final Assessment (Included on Official PDF)
              </label>
              <textarea
                rows={3}
                value={finalAssessment}
                onChange={(e) => setFinalAssessment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejectModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-[#DC2626] hover:bg-red-100"
            >
              <XCircle className="h-4 w-4" />
              Reject Inspection
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => setRevisionModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100"
            >
              <RotateCcw className="h-4 w-4" />
              Request Corrections
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleApproveAndGenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {busy
                ? "Generating PDF Report..."
                : booking.report?.isApproved
                ? "Regenerate & Re-issue Approved PDF"
                : "Approve & Generate Official PDF Report"}
            </button>
          </div>
        </div>
      </main>

      {/* Request Corrections Modal */}
      <Modal
        open={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title="Request Technician Corrections"
        description="The booking will return to the technician with your feedback."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleRequestRevision} className="space-y-4">
          <textarea
            required
            rows={4}
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="Specify missing photos, unclear item ratings, or required re-checks..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRevisionModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-bold text-white"
            >
              Send Revision Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Inspection Submission"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <textarea
            required
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejecting this inspection..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-bold text-white"
            >
              Confirm Reject
            </button>
          </div>
        </form>
      </Modal>

      {/* Photo Lightbox */}
      <Modal
        open={Boolean(lightboxMediaId)}
        onClose={() => setLightboxMediaId(null)}
        title="Inspection Photograph"
        maxWidthClass="max-w-3xl"
      >
        {lightboxMediaId && (
          <img
            src={`/api/media/${lightboxMediaId}`}
            alt="Full resolution inspection evidence"
            className="max-h-[70vh] w-full rounded-xl object-contain"
          />
        )}
      </Modal>
    </div>
  );
}

