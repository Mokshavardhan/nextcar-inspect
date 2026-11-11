"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useToast } from "@/components/ui/ToastProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    whatsappNumber: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Registration failed");
        return;
      }

      toast({
        type: "success",
        title: "Account Created",
        description: "Welcome to NextCar Inspect!",
      });
      router.push("/dashboard/customer");
      router.refresh();
    } catch {
      setErrorMsg("Unable to create account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="mb-8">
        <Link href="/">
          <BrandLogo subtitle="Customer Registration" />
        </Link>
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-[#101B35]">Create Customer Account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Book vehicle inspections, track technician assignments, and download certified PDF
          reports.
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-[#DC2626]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Rohan Sharma"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Password (min 6 chars) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Mobile Number *
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98450 40404"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              placeholder="Same as mobile if blank"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Default Address (Optional)
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="12th Main Road, Indiranagar"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Bengaluru"
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Karnataka"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Postal Code</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="560038"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Creating Account..." : "Create Customer Account"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-[#2563EB] hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}

