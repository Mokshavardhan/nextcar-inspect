"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface NotificationRow {
  id: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  eventType: string;
  booking?: { id: string; bookingNumber: string } | null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore transient poll errors
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 25000);
    return () => clearInterval(timer);
  }, [load]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-[#101B35]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h4 className="text-sm font-bold text-[#101B35]">Notifications</h4>
                <p className="text-xs text-slate-500">{unreadCount} unread updates</p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#2563EB] hover:bg-blue-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No notifications yet.
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markOneRead(n.id)}
                    className={`cursor-pointer px-4 py-3 transition hover:bg-slate-50 ${
                      !n.isRead ? "bg-blue-50/40" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-[#101B35]">{n.subject}</p>
                      {!n.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" />
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.message}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDateTime(n.createdAt)}</span>
                      {n.booking && (
                        <span className="font-semibold text-[#2563EB]">
                          {n.booking.bookingNumber}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

