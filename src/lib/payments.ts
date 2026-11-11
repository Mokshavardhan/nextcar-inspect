import crypto from "crypto";
import Stripe from "stripe";

export interface PaymentPlanSummary {
  paymentOption: "FULL" | "ADVANCE" | "PAY_LATER";
  servicePrice: number;
  amountToPayNow: number;
  remainingBalance: number;
}

export function calculatePaymentAmounts(
  servicePrice: number,
  paymentOption: "FULL" | "ADVANCE" | "PAY_LATER",
  advancePercentage: number
): PaymentPlanSummary {
  const price = Math.round(servicePrice * 100) / 100;
  if (paymentOption === "FULL") {
    return {
      paymentOption,
      servicePrice: price,
      amountToPayNow: price,
      remainingBalance: 0,
    };
  }
  if (paymentOption === "ADVANCE") {
    const pct = Math.max(5, Math.min(95, advancePercentage));
    const advance = Math.round(price * (pct / 100) * 100) / 100;
    return {
      paymentOption,
      servicePrice: price,
      amountToPayNow: advance,
      remainingBalance: Math.round((price - advance) * 100) / 100,
    };
  }
  return {
    paymentOption: "PAY_LATER",
    servicePrice: price,
    amountToPayNow: 0,
    remainingBalance: price,
  };
}

function getSigningSecret(): string {
  return (
    process.env.AUTH_SECRET || "nextcar-inspect-local-dev-secret-change-in-production-2026"
  );
}

export function createPaymentVerificationToken(params: {
  bookingId: string;
  paymentId: string;
  amount: number;
}): string {
  const payload = `${params.bookingId}:${params.paymentId}:${params.amount.toFixed(2)}`;
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export function verifyPaymentVerificationToken(
  params: { bookingId: string; paymentId: string; amount: number },
  token: string
): boolean {
  const expected = createPaymentVerificationToken(params);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

