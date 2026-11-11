"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  Play,
  Save,
  Send,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { RATING_META, type ChecklistRating } from "@/lib/constants";
import { BookingStatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { formatDate } from "@/lib/format";

interface ChecklistCategoryData {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  items: Array<{
    id: string;
    code: string;
    label: string;
    description?: string | null;
  }>;
}

interface MediaRow {
  id: string;
  mediaType: string;
  originalName: string;
  mimeType: string;
  categoryTag?: string | null;
  caption?: string | null;
}

interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  scheduledDate: string;
  timeSlotLabel: string;
  address: string;
  city: string;
  state: string;
  contactName: string;
  contactPhone: string;
  customerNotes?: string | null;
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
  inspection?: {
    id: string;
    overallCondition?: string | null;
    observations?: string | null;
    comments?: string | null;
    criticalIssues?: string | null;
    recommendations?: string | null;
    finalAssessment?: string | null;
    revisionNotes?: string | null;
    isDraft: boolean;
    responses: Array<{
      checklistItemId: string;
      rating: string;
      notes?: string | null;
    }>;
    media: MediaRow[];
  } | null;
}

const RATINGS: ChecklistRating[] = ["GOOD", "NEEDS_ATTENTION", "CRITICAL", "NOT_APPLICABLE"];

export function TechnicianInspectionWorkspace({
  initialBooking,
  categories,
}: {
  initialBooking: BookingDetail;
  categories: ChecklistCategoryData[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [booking, setBooking] = useState<BookingDetail>(initialBooking);
  const [activeCategoryCode, setActiveCategoryCode] = useState(categories[0]?.code || "EXTERIOR");

  const initialResponseMap: Record<string, { rating: ChecklistRating; notes: string }> = {};
  for (const r of initialBooking.inspection?.responses || []) {
    initialResponseMap[r.checklistItemId] = {
      rating: r.rating as ChecklistRating,
      notes: r.notes || "",
    };
  }

  const [responses, setResponses] = useState(initialResponseMap);
  const [overallCondition, setOverallCondition] = useState<string>(
    initialBooking.inspection?.overallCondition || "GOOD"
  );
  const [observations, setObservations] = useState(initialBooking.inspection?.observations || "");
  const [comments, setComments] = useState(initialBooking.inspection?.comments || "");
  const [criticalIssues, setCriticalIssues] = useState(
    initialBooking.inspection?.criticalIssues || ""
  );
  const [recommendations, setRecommendations] = useState(
    initialBooking.inspection?.recommendations || ""
  );
  const [finalAssessment, setFinalAssessment] = useState(
    initialBooking.inspection?.finalAssessment || ""
  );

  const [media, setMedia] = useState<MediaRow[]>(initialBooking.inspection?.media || []);
  const [uploadTag, setUploadTag] = useState("Exterior");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const isReadOnly = ![
    "TECHNICIAN_ASSIGNED",
    "RESCHEDULED",
    "INSPECTION_STARTED",
    "REVISION_REQUESTED",
  ].includes(booking.status);

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const completedCount = Object.keys(responses).length;

  const handleStartInspection = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/inspection/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start inspection");
      setBooking((b) => ({ ...b, status: "INSPECTION_STARTED" }));
      toast({ type: "success", title: "Inspection Started" });
    } catch (err) {
      toast({
        type: "error",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFiles = async (fileList: FileList | null, mediaType: "PHOTO" | "DOCUMENT") => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((f) => formData.append("files", f));
      formData.append("mediaType", mediaType);
      formData.append("categoryTag", uploadTag);
      if (uploadCaption.trim()) formData.append("caption", uploadCaption.trim());

      const res = await fetch(`/api/bookings/${booking.id}/media`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMedia((prev) => [...prev, ...(data.media || [])]);
      setUploadCaption("");
      toast({
        type: "success",
        title: `${mediaType === "PHOTO" ? "Photos" : "Documents"} Uploaded`,
      });
    } catch (err) {
      toast({
        type: "error",
        title: "Upload Error",
        description: err instanceof Error ? err.message : "Could not upload file",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    const res = await fetch(`/api/media/${mediaId}`, { method: "DELETE" });
    if (res.ok) {
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      toast({ type: "info", title: "Media Removed" });
    }
  };

  const handleSaveOrSubmit = async (submit: boolean) => {
    setSaving(true);
    try {
      const payloadResponses = Object.entries(responses).map(([checklistItemId, val]) => ({
        checklistItemId,
        rating: val.rating,
        notes: val.notes || null,
      }));

      const res = await fetch(`/api/bookings/${booking.id}/inspection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallCondition,
          observations,
          comments,
          criticalIssues,
          recommendations,
          finalAssessment,
          submit,
          responses: payloadResponses,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      if (submit) {
        setConfirmSubmitOpen(false);
        toast({
          type: "success",
          title: "Inspection Submitted!",
          description: "Moved to Under Review for administrator quality verification.",
        });
        router.push("/dashboard/technician");
        router.refresh();
      } else {
        setBooking((b) => ({
          ...b,
          status: b.status === "TECHNICIAN_ASSIGNED" ? "INSPECTION_STARTED" : b.status,
        }));
        toast({ type: "success", title: "Inspection Draft Saved" });
      }
    } catch (err) {
      setConfirmSubmitOpen(false);
      toast({
        type: "error",
        title: submit ? "Submission Blocked" : "Save Failed",
        description: err instanceof Error ? err.message : "Please verify all required fields.",
      });
    } finally {
      setSaving(false);
    }
  };

  const markCategoryAllGood = (cat: ChecklistCategoryData) => {
    setResponses((prev) => {
      const next = { ...prev };
      for (const item of cat.items) {
        if (!next[item.id]) {
          next[item.id] = { rating: "GOOD", notes: "" };
        }
      }
      return next;
    });
  };

  const activeCategory = categories.find((c) => c.code === activeCategoryCode) || categories[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Mobile-First Sticky Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#101B35] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/technician"
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Back to Technician Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold">{booking.bookingNumber}</span>
                <BookingStatusBadge status={booking.status} />
              </div>
              <p className="text-xs text-slate-300">
                {booking.vehicle.manufacturingYear} {booking.vehicle.manufacturer}{" "}
                {booking.vehicle.model} ({booking.vehicle.registrationNumber})
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="font-bold text-blue-300">
              {completedCount}/{totalItems}
            </span>
            <p className="text-[11px] text-slate-300">Checked</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Booking & Vehicle Summary Banner */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1 text-xs text-slate-600">
              <p className="text-sm font-bold text-[#101B35]">{booking.service.name}</p>
              <p>
                Customer: <strong>{booking.contactName}</strong> ({booking.contactPhone})
              </p>
              <p>
                Location: {booking.address}, {booking.city}, {booking.state}
              </p>
              <p>
                Slot: {formatDate(booking.scheduledDate)} ({booking.timeSlotLabel})
              </p>
              <p>
                Powertrain: {booking.vehicle.fuelType} • {booking.vehicle.transmissionType}
              </p>
              {booking.customerNotes && (
                <p className="rounded bg-slate-50 px-2.5 py-1.5 text-slate-700">
                  Customer Note: {booking.customerNotes}
                </p>
              )}
            </div>

            {booking.status === "TECHNICIAN_ASSIGNED" && (
              <button
                type="button"
                onClick={handleStartInspection}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
              >
                <Play className="h-4 w-4" />
                Start Inspection
              </button>
            )}
          </div>

          {booking.status === "REVISION_REQUESTED" && booking.inspection?.revisionNotes && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs text-orange-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
              <div>
                <p className="font-bold">Administrator Revision Notes:</p>
                <p className="mt-0.5">{booking.inspection.revisionNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const catChecked = cat.items.filter((i) => responses[i.id]).length;
            const active = cat.code === activeCategory?.code;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryCode(cat.code)}
                className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                  active
                    ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                    : "border-slate-200 bg-white text-[#101B35] hover:bg-slate-50"
                }`}
              >
                {cat.name}{" "}
                <span className={active ? "text-blue-100" : "text-slate-400"}>
                  ({catChecked}/{cat.items.length})
                </span>
              </button>
            );
          })}
        </div>

        {/* Checklist Items for Active Category */}
        {activeCategory && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#101B35]">{activeCategory.name}</h2>
                {activeCategory.description && (
                  <p className="text-xs text-slate-500">{activeCategory.description}</p>
                )}
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => markCategoryAllGood(activeCategory)}
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-[#16A34A] hover:bg-green-100"
                >
                  Mark Unchecked as Good
                </button>
              )}
            </div>

            <div className="mt-4 space-y-5">
              {activeCategory.items.map((item) => {
                const current = responses[item.id];
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-bold text-[#101B35]">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500">{item.description}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        {RATINGS.map((r) => {
                          const meta = RATING_META[r];
                          const isSelected = current?.rating === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              disabled={isReadOnly}
                              onClick={() =>
                                setResponses((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    rating: r,
                                    notes: prev[item.id]?.notes || "",
                                  },
                                }))
                              }
                              className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                isSelected
                                  ? meta.buttonActiveClass
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              } disabled:opacity-70`}
                            >
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={current?.notes || ""}
                      onChange={(e) =>
                        setResponses((prev) => ({
                          ...prev,
                          [item.id]: {
                            rating: prev[item.id]?.rating || "GOOD",
                            notes: e.target.value,
                          },
                        }))
                      }
                      placeholder="Item-specific finding or measurement (optional)..."
                      className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#2563EB] focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vehicle Photograph & Document Upload Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#101B35]">
            Inspection Photographs & Supporting Documents
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Capture live photos from your mobile camera or upload images & verification documents.
          </p>

          {!isReadOnly && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Category Tag
                  </label>
                  <select
                    value={uploadTag}
                    onChange={(e) => setUploadTag(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                  >
                    <option value="Exterior">Exterior</option>
                    <option value="Interior">Interior</option>
                    <option value="Engine">Engine Bay</option>
                    <option value="Mechanical">Mechanical / Underbody</option>
                    <option value="Documents">Documents Verification</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Caption / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    placeholder="e.g. Front left tyre tread / OBD reading"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
                  <Camera className="h-4 w-4" />
                  <span>{uploading ? "Uploading..." : "Capture Camera Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={uploading}
                    onChange={(e) => handleUploadFiles(e.target.files, "PHOTO")}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-[#101B35] hover:bg-slate-50">
                  <ImagePlus className="h-4 w-4 text-[#2563EB]" />
                  <span>Upload Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={(e) => handleUploadFiles(e.target.files, "PHOTO")}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-[#101B35] hover:bg-slate-50">
                  <FileText className="h-4 w-4 text-[#16A34A]" />
                  <span>Upload Document (PDF/Img)</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    disabled={uploading}
                    onChange={(e) => handleUploadFiles(e.target.files, "DOCUMENT")}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {media.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  {m.mediaType === "PHOTO" ? (
                    <img
                      src={`/api/media/${m.id}`}
                      alt={m.caption || m.originalName}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 flex-col items-center justify-center bg-slate-50 p-3 text-center">
                      <FileText className="h-8 w-8 text-[#2563EB]" />
                      <a
                        href={`/api/media/${m.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 truncate text-xs font-bold text-[#2563EB] hover:underline max-w-full"
                      >
                        {m.originalName}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 p-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#101B35]">
                        {m.categoryTag || m.mediaType}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {m.caption || m.originalName}
                      </p>
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMedia(m.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-[#DC2626]"
                        aria-label="Delete upload"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary & Observations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-[#101B35]">
            Technician Assessment & Final Observations
          </h2>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Overall Vehicle Condition *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["GOOD", "NEEDS_ATTENTION", "CRITICAL"] as const).map((cond) => {
                const meta = RATING_META[cond];
                const active = overallCondition === cond;
                return (
                  <button
                    key={cond}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setOverallCondition(cond)}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                      active
                        ? meta.buttonActiveClass
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Observations *
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Key findings across road test, diagnostics, and body condition..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Additional Comments
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="OBD scan summary, odometer reading, test drive notes..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Critical Issues (if any)
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={criticalIssues}
                onChange={(e) => setCriticalIssues(e.target.value)}
                placeholder="Any urgent safety or mechanical issues requiring immediate attention..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Recommendations
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Recommended service intervals or repair estimates..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Final Assessment Summary
            </label>
            <textarea
              rows={2}
              disabled={isReadOnly}
              value={finalAssessment}
              onChange={(e) => setFinalAssessment(e.target.value)}
              placeholder="Concluding engineering recommendation for buyer/owner..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar (Mobile-First) */}
      {!isReadOnly ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveOrSubmit(false)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#101B35] hover:bg-slate-50 sm:flex-none"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmSubmitOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-700 sm:flex-none"
            >
              <Send className="h-4 w-4" />
              Submit Inspection
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 text-[#16A34A]">
              <CheckCircle2 className="h-4 w-4" />
              Inspection submitted — status: {booking.status.replace(/_/g, " ")}
            </span>
            <Link
              href="/dashboard/technician"
              className="font-bold text-[#2563EB] hover:underline"
            >
              Return to Assigned List
            </Link>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={() => handleSaveOrSubmit(true)}
        loading={saving}
        title="Submit Completed Inspection?"
        message={`You have evaluated ${completedCount} of ${totalItems} checklist items and uploaded ${media.length} file(s). Once submitted, the inspection moves to Under Review for administrator approval.`}
        confirmLabel="Confirm & Submit"
      />
    </div>
  );
}

