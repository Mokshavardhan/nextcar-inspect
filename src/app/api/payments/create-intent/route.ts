import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";
import { generateTransactionId } from "@/lib/format";
import { createPaymentVerificationToken, getStripeClient } from "@/lib/payments";

const intentSchema = z.object({
  bookingId: z.string().min(1),
  mode: z.enum(["FULL", "ADVANCE", "BALANCE"]).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser(["CUSTOMER", "ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = intentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment intent request" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      include: { service: true, vehicle: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (auth.user.role === "CUSTOMER" && booking.customerId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const remaining = Math.max(0, Math.round((booking.servicePrice - booking.amountPaid) * 100) / 100);
    if (remaining <= 0) {
      return NextResponse.json({ error: "This booking is already paid in full." }, { status: 400 });
    }

    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });

    const amountToCharge =
      booking.amountPaid === 0 && booking.amountToPayNow > 0 && booking.amountToPayNow < remaining
        ? booking.amountToPayNow
        : remaining;

    const paymentMode = booking.amountPaid > 0 ? "BALANCE" : parsed.data.mode || "FULL";
    const stripe = getStripeClient();

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        customerId: booking.customerId,
        transactionId: generateTransactionId("INIT"),
        gateway: stripe ? "STRIPE" : "SANDBOX_CARD",
        paymentMode,
        amount: amountToCharge,
        currency: settings.currency,
        status: "PENDING",
      },
    });

    if (stripe) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: booking.contactEmail,
        line_items: [
          {
            price_data: {
              currency: settings.currency.toLowerCase(),
              unit_amount: Math.round(amountToCharge * 100),
              product_data: {
                name: `${booking.service.name} (${booking.bookingNumber})`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          bookingId: booking.id,
          paymentId: payment.id,
        },
        success_url: `${appUrl}/dashboard/customer?payment=success&bookingId=${booking.id}&paymentId=${payment.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard/customer?payment=cancelled`,
      });
      return NextResponse.json({
        paymentIntent: {
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          gateway: "STRIPE",
          checkoutUrl: session.url,
        },
      });
    }

    const verificationToken = createPaymentVerificationToken({
      bookingId: booking.id,
      paymentId: payment.id,
      amount: payment.amount,
    });

    return NextResponse.json({
      paymentIntent: {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        gateway: "SANDBOX_CARD",
        verificationToken,
      },
    });
  } catch (err) {
    console.error("Create payment intent error:", err);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}

