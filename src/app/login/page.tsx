"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Shield, Wrench, User } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useToast } from "@/components/ui/ToastProvider";

const DEMO_ACCOUNTS = [
  {
    label: "Customer",
    email: "alex.customer@example.com",
    pass: "Customer@1234",
    icon: User,
  },
  {
    label: "Technician",
    email: "marcus.tech@nextcarinspect.com",
    pass: "Tech@1234",
    icon: Wrench,
  },
  {
    label: "Admin",
    email: "admin@nextcarinspect.com",
    pass: "Admin@1234",
    icon: Shield,
  },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Sign in failed");
        return;
      }

      toast({
        type: "success",
        title: `Welcome back, ${data.user.name}`,
        description: `Signed in as ${data.user.role.toLowerCase()}.`,
      });

      const nextPath = searchParams.get("next");
      router.push(nextPath || data.redirectTo || "/dashboard/customer");
      router.refresh();
    } catch {
      setErrorMsg("Unable to reach authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="mb-8">
        <Link href="/">
          <BrandLogo subtitle="Platform Sign In" />
        </Link>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-[#101B35]">Sign in to your account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Access your Customer, Technician, or Administrator portal.
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-[#DC2626]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quick Demo Accounts (Local Testing)
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.label}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.pass);
                    performLogin(acc.email, acc.pass);
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-[#F8FAFC] px-2 py-2.5 text-xs font-semibold text-[#101B35] transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <Icon className="h-4 w-4 text-[#2563EB]" />
                  {acc.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          New customer?{" "}
          <Link href="/register" className="font-bold text-[#2563EB] hover:underline">
            Create an account
          </Link>{" "}
          or{" "}
          <Link href="/book" className="font-bold text-[#101B35] hover:underline">
            Book directly
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm">Loading sign in...</div>}>
      <LoginContent />
    </Suspense>
  );
}

