"use client";

import React, { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export function ContactForm() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to submit inquiry");

      setSent(true);
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
      toast({
        type: "success",
        title: "Inquiry Received",
        description: "Our inspection coordination team will respond shortly.",
      });
    } catch (err) {
      toast({
        type: "error",
        title: "Submission Failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#16A34A]" />
        <h3 className="mt-3 text-lg font-bold text-[#101B35]">Thank You for Reaching Out</h3>
        <p className="mt-1 text-sm text-slate-600">
          Your message has been logged and our support administrators have been notified.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 rounded-lg bg-[#101B35] px-4 py-2 text-sm font-semibold text-white"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-xl font-bold text-[#101B35]">Send Us a Message</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rohan Sharma"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Email Address *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98450 40404"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Subject *</label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Fleet / Pre-Purchase Inquiry"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Message *</label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share vehicle details, location, or your question..."
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {submitting ? "Sending..." : "Submit Inquiry"}
      </button>
    </form>
  );
}

