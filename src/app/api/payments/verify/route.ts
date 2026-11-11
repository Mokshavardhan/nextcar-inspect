import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { generateTransactionId } from "@/lib/format";
import { getStripeClient, verifyPaymentVerificationToken } from "@/lib/payments";
import { logBookingActivity } from "@/lib/workflow";
import { notifyBookingConfirmed, notifyPaymentReceived } from "@/lib/notifications";

const verifySchema = z.object({
  bookingId: z.string().min(1),
  paymentId: z.string().min(1),
  gateway: z.enum(["SANDBOX_CARD", "STRIPE"]).default("SANDBOX_CARD"),
  verificationToken: z.string().optional(),
  stripeSessionId: z.string().optional(),
  cardHolder: z.string().trim().optional(),
  cardLast4: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser(["CUSTOMER", "ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payment verification request" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const payment = await prisma.payment.findUnique({
      where: { id: d.paymentId },
      include: { booking: true },
    });

    if (!payment || payment.bookingId !== d.bookingId) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }
    if (auth.user.role === "CUSTOMER" && payment.customerId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (payment.status === "PAID") {
      return NextResponse.json({ payment, booking: payment.booking, alreadyPaid: true });
    }

    let verifiedTransactionId = generateTransactionId("VER");
    let gatewayUsed = d.gateway;

    if (d.gateway === "STRIPE") {
      const stripe = getStripeClient();
      if (!stripe || !d.stripeSessionId) {
        return NextResponse.json(
          { error: "Stripe session verification missing or unconfigured." },
          { status: 400 }
        );
      }
      const session = await stripe.checkout.sessions.retrieve(d.stripeSessionId);
      if (
        session.payment_status !== "paid" ||
        session.metadata?.paymentId !== payment.id ||
        session.metadata?.bookingId !== payment.bookingId
      ) {
        return NextResponse.json(
          { error: "Stripe payment has not been confirmed as paid." },
          { status: 400 }
        );
      }
      verifiedTransactionId = String(session.payment_intent || session.id);
    } else {
      if (!d.verificationToken) {
        return NextResponse.json(
          { error: "Missing payment verification signature." },
          { status: 400 }
        );
      }
      const validSig = verifyPaymentVerificationToken(
        {
          bookingId: payment.bookingId,
          paymentId: payment.id,
          amount: payment.amount,
        },
        d.verificationToken
      );
      if (!validSig) {
        return NextResponse.json(
          { error: "Payment verification signature mismatch. Transaction rejected." },
          { status: 400 }
        );
      }
      if (!d.cardLast4 || !/^\d{4}$/.test(d.cardLast4)) {
        return NextResponse.json(
          { error: "Valid payment card details are required." },
          { status: 400 }
        );
      }
      gatewayUsed = "SANDBOX_CARD";
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          gateway: gatewayUsed,
          transactionId: verifiedTransactionId,
          verifiedAt: new Date(),
          metadata: JSON.stringify({
            cardHolder: d.cardHolder || payment.booking.contactName,
            cardLast4: d.cardLast4 || "4242",
          }),
        },
      });

      const newAmountPaid =
        Math.round((payment.booking.amountPaid + payment.amount) * 100) / 100;
      const isFullyPaid = newAmountPaid >= payment.booking.servicePrice - 0.01;
      const nextPaymentStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID";
      const shouldConfirm = payment.booking.status === "PENDING";

      const updatedBooking = await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus: nextPaymentStatus,
          ...(shouldConfirm ? { status: "CONFIRMED" } : {}),
        },
        include: {
          service: true,
          vehicle: true,
        },
      });

      return { updatedPayment, updatedBooking, shouldConfirm };
    });

    await logBookingActivity({
      bookingId: payment.bookingId,
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: "PAYMENT_VERIFIED",
      fromStatus: payment.booking.status,
      toStatus: result.updatedBooking.status,
      details: `Verified payment of ${payment.amount.toFixed(2)} ${payment.currency} (${verifiedTransactionId}).`,
    });

    await notifyPaymentReceived(payment.bookingId, payment.amount, verifiedTransactionId);
    if (result.shouldConfirm) {
      await notifyBookingConfirmed(payment.bookingId);
    }

    return NextResponse.json({
      payment: result.updatedPayment,
      booking: result.updatedBooking,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Payment verification failed." }, { status: 500 });
  }
}

