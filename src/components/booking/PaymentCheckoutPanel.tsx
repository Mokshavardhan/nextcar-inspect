"use client";

import React, { useState } from "react";
import { CreditCard, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/ToastProvider";

export interface PaymentIntentData {
  paymentId: string;
  amount: number;
  currency: string;
  gateway: "STRIPE" | "SANDBOX_CARD";
  verificationToken?: string;
  checkoutUrl?: string;
}

export function PaymentCheckoutPanel({
  bookingId,
  intent,
  defaultName,
  onSuccess,
  onCancel,
}: {
  bookingId: string;
  intent: PaymentIntentData;
  defaultName?: string;
  onSuccess: (verifiedBooking: unknown) => void;
  onCancel?: () => void;
}) {
  const { toast } = useToast();
  const [cardHolder, setCardHolder] = useState(defaultName || "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fillTestCard = () => {
    setCardHolder(defaultName || "Rohan Sharma");
    setCardNumber("4242 4242 4242 4242");
    setExpiry("12/28");
    setCvc("424");
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (intent.gateway === "STRIPE" && intent.checkoutUrl) {
      window.location.href = intent.checkoutUrl;
      return;
    }

    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      toast({ type: "error", title: "Invalid Card Number", description: "Please enter a valid 16-digit card number." });
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry.trim())) {
      toast({ type: "error", title: "Invalid Expiry", description: "Enter expiry in MM/YY format." });
      return;
    }
    if (!/^\d{3,4}$/.test(cvc.trim())) {
      toast({ type: "error", title: "Invalid CVC", description: "Enter 3 or 4 digit security code." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          paymentId: intent.paymentId,
          gateway: "SANDBOX_CARD",
          verificationToken: intent.verificationToken,
          cardHolder: cardHolder.trim() || defaultName || "Cardholder",
          cardLast4: digits.slice(-4),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment verification failed");
      }
      toast({
        type: "success",
        title: "Payment Verified",
        description: `${formatCurrency(intent.amount, intent.currency)} paid successfully.`,
      });
      onSuccess(data.booking);
    } catch (err) {
      toast({
        type: "error",
        title: "Payment Failed",
        description: err instanceof Error ? err.message : "Could not verify payment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (intent.gateway === "STRIPE" && intent.checkoutUrl) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3 text-[#101B35]">
          <ShieldCheck className="h-6 w-6 text-[#2563EB]" />
          <div>
            <h4 className="font-bold">Secure Stripe Checkout</h4>
            <p className="text-sm text-slate-600">
              Amount due: {formatCurrency(intent.amount, intent.currency)}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePay}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Lock className="h-4 w-4" />
            Proceed to Stripe Checkout
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePay} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#101B35]">Encrypted Card Checkout</h4>
            <p className="text-xs text-slate-500">
              Amount to authorize: <strong className="text-[#101B35]">{formatCurrency(intent.amount, intent.currency)}</strong>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fillTestCard}
          className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-blue-100"
        >
          Autofill Demo Card
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Cardholder Name
          </label>
          <input
            type="text"
            required
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            placeholder="Name on card"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Card Number</label>
          <input
            type="text"
            required
            value={cardNumber}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
              const grouped = raw.replace(/(.{4})/g, "$1 ").trim();
              setCardNumber(grouped);
            }}
            placeholder="4242 4242 4242 4242"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Expiry (MM/YY)</label>
          <input
            type="text"
            required
            value={expiry}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
              setExpiry(raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw);
            }}
            placeholder="12/28"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">CVC / CVV</label>
          <input
            type="text"
            required
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="424"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
        <span>
          Server-side HMAC cryptographic verification confirms your payment before marking the booking as Confirmed.
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Pay Later / Back
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          {submitting
            ? "Verifying Payment..."
            : `Verify & Pay ${formatCurrency(intent.amount, intent.currency)}`}
        </button>
      </div>
    </form>
  );
}

