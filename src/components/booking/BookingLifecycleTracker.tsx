import React from "react";
import { Check, AlertTriangle, Clock } from "lucide-react";
import { BOOKING_LIFECYCLE_STEPS, BOOKING_STATUS_META } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

interface ActivityEntry {
  id: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: string | null;
  actorRole: string;
  createdAt: string;
  actor?: { name: string; role: string } | null;
}

export function BookingLifecycleTracker({
  currentStatus,
  activities = [],
}: {
  currentStatus: string;
  activities?: ActivityEntry[];
}) {
  const isTerminalInterrupt = ["CANCELLED", "REJECTED"].includes(currentStatus);
  const currentIdx = BOOKING_LIFECYCLE_STEPS.indexOf(
    currentStatus as (typeof BOOKING_LIFECYCLE_STEPS)[number]
  );

  return (
    <div className="space-y-6">
      {isTerminalInterrupt || currentStatus === "REVISION_REQUESTED" || currentStatus === "RESCHEDULED" ? (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            currentStatus === "REJECTED"
              ? "border-red-200 bg-red-50 text-red-800"
              : currentStatus === "CANCELLED"
              ? "border-slate-200 bg-slate-100 text-slate-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">
              Current Status: {BOOKING_STATUS_META[currentStatus]?.label || currentStatus}
            </p>
            <p className="mt-0.5 text-xs">
              {currentStatus === "REVISION_REQUESTED"
                ? "Administrator requested corrections from the assigned technician before final report approval."
                : currentStatus === "RESCHEDULED"
                ? "This booking has been rescheduled to an updated date/time slot."
                : "This booking has reached a closed state."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[680px] items-center justify-between gap-2">
          {BOOKING_LIFECYCLE_STEPS.map((step, idx) => {
            const done = currentIdx >= idx;
            const active = currentIdx === idx;
            const label = BOOKING_STATUS_META[step]?.label || step;

            return (
              <div key={step} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <div
                    className={`h-0.5 flex-1 ${
                      idx === 0
                        ? "bg-transparent"
                        : done
                        ? "bg-[#2563EB]"
                        : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                      active
                        ? "border-[#2563EB] bg-[#2563EB] text-white ring-4 ring-blue-100"
                        : done
                        ? "border-[#16A34A] bg-[#16A34A] text-white"
                        : "border-slate-300 bg-white text-slate-400"
                    }`}
                  >
                    {done && !active ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <div
                    className={`h-0.5 flex-1 ${
                      idx === BOOKING_LIFECYCLE_STEPS.length - 1
                        ? "bg-transparent"
                        : currentIdx > idx
                        ? "bg-[#2563EB]"
                        : "bg-slate-200"
                    }`}
                  />
                </div>
                <span
                  className={`mt-2 text-[11px] font-semibold leading-tight ${
                    active ? "text-[#2563EB]" : done ? "text-[#101B35]" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {activities.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Booking Activity History
          </h4>
          <div className="space-y-2.5">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#101B35]">
                      {act.action.replace(/_/g, " ")}
                      {act.toStatus ? ` → ${BOOKING_STATUS_META[act.toStatus]?.label || act.toStatus}` : ""}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDateTime(act.createdAt)}
                    </span>
                  </div>
                  {act.details && <p className="mt-0.5 text-xs text-slate-600">{act.details}</p>}
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    By {act.actor?.name || "System"} ({act.actorRole})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

