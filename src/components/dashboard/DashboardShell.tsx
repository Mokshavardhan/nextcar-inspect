"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, LogOut, Home } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { NotificationBell } from "@/components/ui/NotificationBell";

export interface NavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export function DashboardShell({
  roleLabel,
  userName,
  userEmail,
  tabs,
  activeTab,
  onTabChange,
  headerActions,
  children,
}: {
  roleLabel: string;
  userName: string;
  userEmail: string;
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#101B35] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Link href="/">
          <BrandLogo variant="light" subtitle={roleLabel} />
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1 text-slate-300 hover:bg-white/10 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onTabChange(tab.id);
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
              {tab.badge !== undefined && Number(tab.badge) > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-blue-500/20 text-blue-200"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 space-y-2">
        <div className="rounded-xl bg-white/5 px-3 py-2.5">
          <p className="truncate text-xs font-bold text-white">{userName}</p>
          <p className="truncate text-[11px] text-slate-400">{userEmail}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <Home className="h-3.5 w-3.5" />
            Website
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500/80"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 w-72 max-w-[85vw]">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-[#101B35] sm:text-lg">
                {tabs.find((t) => t.id === activeTab)?.label || roleLabel}
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">{roleLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {headerActions}
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

