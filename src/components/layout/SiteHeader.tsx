"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LayoutDashboard, LogOut, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface HeaderUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function SiteHeader({ initialUser = null }: { initialUser?: HeaderUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<HeaderUser | null>(initialUser);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      return;
    }
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => null);
  }, [initialUser]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/dashboard/admin"
      : user?.role === "TECHNICIAN"
      ? "/dashboard/technician"
      : "/dashboard/customer";

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Our Services" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : !item.href.includes("#") && pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-semibold transition ${
                  active
                    ? "text-[#2563EB]"
                    : "text-[#172033] hover:text-[#2563EB]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-[#101B35] transition hover:bg-slate-50"
              >
                <LayoutDashboard className="h-4 w-4 text-[#2563EB]" />
                {user.role === "ADMIN"
                  ? "Admin Console"
                  : user.role === "TECHNICIAN"
                  ? "Tech Portal"
                  : "My Dashboard"}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-[#101B35] transition hover:bg-slate-100"
            >
              Sign In
            </Link>
          )}

          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Book an Inspection
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#172033] hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 border-t border-slate-100 pt-2 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#101B35]"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[#2563EB]" />
                    Go to Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-[#101B35]"
                >
                  Sign In / Register
                </Link>
              )}
              <Link
                href="/book"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-[#2563EB] px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Book an Inspection
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

