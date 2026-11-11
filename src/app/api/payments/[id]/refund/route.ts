import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { getStripeClient } from "@/lib/payments";
import { logBookingActivity } from "@/lib/workflow";
import { dispatchNotification } from "@/lib/notifications";

const refundSchema = z.object({
  refundAmount: z.coerce.number().positive(),
  reason: z.string().trim().min(3, "Refund reason is required"),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid refund payload" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
      return NextResponse.json(
        { error: "Only paid transactions can be refunded." },
        { status: 400 }
      );
    }

    const remainingRefundable =
      Math.round((payment.amount - payment.refundAmount) * 100) / 100;
    if (parsed.data.refundAmount > remainingRefundable) {
      return NextResponse.json(
        { error: `Refund cannot exceed remaining refundable amount (${remainingRefundable.toFixed(2)}).` },
        { status: 400 }
      );
    }

    if (payment.gateway === "STRIPE" && payment.transactionId.startsWith("pi_")) {
      const stripe = getStripeClient();
      if (stripe) {
        await stripe.refunds.create({
          payment_intent: payment.transactionId,
          amount: Math.round(parsed.data.refundAmount * 100),
        });
      }
    }

    const totalRefunded =
      Math.round((payment.refundAmount + parsed.data.refundAmount) * 100) / 100;
    const isFullRefund = totalRefunded >= payment.amount - 0.01;
    const nextPaymentStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

    const updated = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundAmount: totalRefunded,
          refundReason: parsed.data.reason,
          refundedAt: new Date(),
          status: nextPaymentStatus,
        },
      });

      const nextAmountPaid = Math.max(
        0,
        Math.round((payment.booking.amountPaid - parsed.data.refundAmount) * 100) / 100
      );
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          amountPaid: nextAmountPaid,
          paymentStatus: nextAmountPaid <= 0 ? "REFUNDED" : "PARTIALLY_REFUNDED",
        },
      });

      return updatedPayment;
    });

    await logBookingActivity({
      bookingId: payment.bookingId,
      actorId: auth.user.id,
      actorRole: "ADMIN",
      action: "PAYMENT_REFUNDED",
      details: `Refunded ${parsed.data.refundAmount.toFixed(2)} ${payment.currency} on ${payment.transactionId}. Reason: ${parsed.data.reason}`,
    });

    await dispatchNotification({
      userId: payment.customerId,
      bookingId: payment.bookingId,
      eventType: "PAYMENT_REFUNDED",
      subject: `Refund Processed: ${payment.booking.bookingNumber}`,
      message: `A refund of ${parsed.data.refundAmount.toFixed(2)} ${payment.currency} has been processed for booking ${payment.booking.bookingNumber}. Reason: ${parsed.data.reason}`,
      email: payment.booking.contactEmail,
      whatsappNumber: payment.booking.contactWhatsapp || payment.booking.contactPhone,
    });

    return NextResponse.json({ payment: updated });
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: "Refund processing failed" }, { status: 500 });
  }
}

