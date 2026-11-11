import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser(["ADMIN", "CUSTOMER"]);
  if (auth.errorResponse) return auth.errorResponse;

  const payments = await prisma.payment.findMany({
    where: auth.user.role === "CUSTOMER" ? { customerId: auth.user.id } : {},
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          servicePrice: true,
          amountPaid: true,
          paymentStatus: true,
          service: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({ payments });
}

