import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hashPassword,
  requireApiUser,
  setSessionCookie,
  signSessionToken,
} from "@/lib/auth";
import {
  generateBookingNumber,
  generateTransactionId,
  getTodayDateStr,
} from "@/lib/format";
import {
  calculatePaymentAmounts,
  createPaymentVerificationToken,
  getStripeClient,
} from "@/lib/payments";
import { notifyBookingCreated } from "@/lib/notifications";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const date = searchParams.get("date")?.trim() || "";
  const customerFilter = searchParams.get("customer")?.trim() || "";
  const vehicleFilter = searchParams.get("vehicle")?.trim() || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (user.role === "CUSTOMER") {
    where.customerId = user.id;
  } else if (user.role === "TECHNICIAN") {
    where.assignments = {
      some: {
        technicianId: user.id,
        isActive: true,
      },
    };
  }

  if (status && status !== "ALL") {
    where.status = status;
  }
  if (date) {
    where.scheduledDate = date;
  }
  if (q) {
    where.OR = [
      { bookingNumber: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } },
      { vehicle: { registrationNumber: { contains: q, mode: "insensitive" } } },
      { vehicle: { manufacturer: { contains: q, mode: "insensitive" } } },
      { vehicle: { model: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (customerFilter) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { contactName: { contains: customerFilter, mode: "insensitive" } },
          { contactEmail: { contains: customerFilter, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (vehicleFilter) {
    where.AND = [
      ...(where.AND || []),
      {
        vehicle: {
          OR: [
            { manufacturer: { contains: vehicleFilter, mode: "insensitive" } },
            { model: { contains: vehicleFilter, mode: "insensitive" } },
            { registrationNumber: { contains: vehicleFilter, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      service: true,
      vehicle: true,
      slot: true,
      customer: {
        select: { id: true, name: true, email: true, phone: true, whatsappNumber: true },
      },
      assignments: {
        where: { isActive: true },
        include: {
          technician: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              whatsappNumber: true,
              technicianProfile: true,
            },
          },
        },
        take: 1,
      },
      inspection: {
        select: {
          id: true,
          overallCondition: true,
          isDraft: true,
          submittedAt: true,
          approvedAt: true,
          revisionNotes: true,
        },
      },
      report: {
        select: {
          id: true,
          reportNumber: true,
          isApproved: true,
          approvedAt: true,
          deliveredAt: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({ bookings });
}

const createBookingSchema = z.object({
  serviceId: z.string().min(1, "Please select an inspection service"),
  existingVehicleId: z.string().optional(),
  vehicle: z
    .object({
      vehicleType: z.enum(["CAR", "SUV", "BIKE"]),
      manufacturer: z.string().trim().min(1, "Manufacturer is required"),
      model: z.string().trim().min(1, "Model is required"),
      manufacturingYear: z.coerce
        .number()
        .int()
        .min(1960)
        .max(new Date().getFullYear() + 1),
      registrationNumber: z.string().trim().min(2, "Registration number is required").toUpperCase(),
      fuelType: z.string().trim().min(1, "Fuel type is required"),
      transmissionType: z.string().trim().min(1, "Transmission type is required"),
      notes: z.string().trim().optional(),
    })
    .optional(),
  customer: z.object({
    fullName: z.string().trim().min(2, "Full name is required"),
    email: z.string().trim().email("Valid email address is required").toLowerCase(),
    phone: z.string().trim().min(7, "Mobile number is required"),
    whatsappNumber: z.string().trim().optional(),
    accountPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  }),
  location: z.object({
    address: z.string().trim().min(4, "Inspection address is required"),
    city: z.string().trim().min(2, "City is required"),
    state: z.string().trim().min(2, "State is required"),
    postalCode: z.string().trim().min(3, "Postal code is required"),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
  }),
  schedule: z.object({
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid scheduled date is required"),
    slotId: z.string().min(1, "Please select a time slot"),
  }),
  paymentOption: z.enum(["FULL", "ADVANCE", "PAY_LATER"]),
  customerNotes: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid booking payload" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    if (!d.existingVehicleId && !d.vehicle) {
      return NextResponse.json(
        { error: "Please provide vehicle information." },
        { status: 400 }
      );
    }

    const todayStr = getTodayDateStr();
    if (d.schedule.scheduledDate < todayStr) {
      return NextResponse.json(
        { error: "Inspection date cannot be in the past." },
        { status: 400 }
      );
    }

    let currentUser = await getCurrentUser();
    let newlyCreatedSessionToken: string | null = null;

    if (!currentUser) {
      const existingUser = await prisma.user.findUnique({
        where: { email: d.customer.email },
      });
      if (existingUser) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please sign in to link this booking to your account.",
            code: "EMAIL_EXISTS_SIGNIN_REQUIRED",
          },
          { status: 409 }
        );
      }

      if (!d.customer.accountPassword) {
        return NextResponse.json(
          {
            error:
              "Please enter a password (min 6 characters) to create your customer account and track your inspection.",
          },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(d.customer.accountPassword);
      const createdUser = await prisma.user.create({
        data: {
          name: d.customer.fullName,
          email: d.customer.email,
          passwordHash,
          role: "CUSTOMER",
          phone: d.customer.phone,
          whatsappNumber: d.customer.whatsappNumber || d.customer.phone,
          isActive: true,
          customerProfile: {
            create: {
              address: d.location.address,
              city: d.location.city,
              state: d.location.state,
              postalCode: d.location.postalCode,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          whatsappNumber: true,
          isActive: true,
          createdAt: true,
          customerProfile: true,
          technicianProfile: true,
        },
      });

      currentUser = createdUser;
      newlyCreatedSessionToken = await signSessionToken({
        sub: createdUser.id,
        email: createdUser.email,
        role: "CUSTOMER",
        name: createdUser.name,
      });
    }

    const customerId = currentUser.id;

    // Perform atomic booking creation with slot capacity + duplicate checks
    const result = await prisma.$transaction(async (tx) => {
      const [service, settings, slot, blockedDate] = await Promise.all([
        tx.service.findUnique({ where: { id: d.serviceId } }),
        tx.platformSettings.upsert({
          where: { id: "default" },
          update: {},
          create: { id: "default" },
        }),
        tx.availabilitySlot.findUnique({ where: { id: d.schedule.slotId } }),
        tx.blockedDate.findUnique({ where: { dateStr: d.schedule.scheduledDate } }),
      ]);

      if (!service || !service.isActive) {
        throw new Error("Selected inspection service is no longer active.");
      }
      if (!slot || !slot.isActive) {
        throw new Error("Selected time slot is unavailable.");
      }
      if (blockedDate) {
        throw new Error(
          `Bookings are unavailable on ${d.schedule.scheduledDate}: ${
            blockedDate.reason || "Blocked date"
          }.`
        );
      }

      // Check slot capacity
      const slotBookingsCount = await tx.booking.count({
        where: {
          scheduledDate: d.schedule.scheduledDate,
          slotId: slot.id,
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
      });
      if (slotBookingsCount >= slot.maxBookingsPerSlot) {
        throw new Error(
          "This time slot has just filled up. Please choose another available slot."
        );
      }

      // Verify payment option is enabled by admin
      if (d.paymentOption === "FULL" && !settings.allowFullPayment) {
        throw new Error("Full online payment is currently disabled by administrator.");
      }
      if (d.paymentOption === "ADVANCE" && !settings.allowAdvancePayment) {
        throw new Error("Advance payment is currently disabled by administrator.");
      }
      if (d.paymentOption === "PAY_LATER" && !settings.allowPayLater) {
        throw new Error("Pay Later option is currently disabled by administrator.");
      }

      // Resolve or create vehicle
      let vehicleRecord;
      if (d.existingVehicleId) {
        vehicleRecord = await tx.vehicle.findFirst({
          where: { id: d.existingVehicleId, customerId },
        });
        if (!vehicleRecord) {
          throw new Error("Selected saved vehicle was not found.");
        }
      } else if (d.vehicle) {
        vehicleRecord = await tx.vehicle.create({
          data: {
            customerId,
            vehicleType: d.vehicle.vehicleType,
            manufacturer: d.vehicle.manufacturer,
            model: d.vehicle.model,
            manufacturingYear: d.vehicle.manufacturingYear,
            registrationNumber: d.vehicle.registrationNumber,
            fuelType: d.vehicle.fuelType,
            transmissionType: d.vehicle.transmissionType,
            notes: d.vehicle.notes || null,
          },
        });
      }

      if (!vehicleRecord) {
        throw new Error("Vehicle record could not be resolved.");
      }

      // Prevent duplicate booking for the same vehicle registration on same date & slot
      const duplicateBooking = await tx.booking.findFirst({
        where: {
          scheduledDate: d.schedule.scheduledDate,
          slotId: slot.id,
          status: { notIn: ["CANCELLED", "REJECTED"] },
          vehicle: {
            registrationNumber: vehicleRecord.registrationNumber,
          },
        },
      });
      if (duplicateBooking) {
        throw new Error(
          `Vehicle ${vehicleRecord.registrationNumber} already has an active booking for ${d.schedule.scheduledDate} (${slot.label}).`
        );
      }

      const plan = calculatePaymentAmounts(
        service.price,
        d.paymentOption,
        settings.advancePercentage
      );

      let bookingNumber = generateBookingNumber();
      while (await tx.booking.findUnique({ where: { bookingNumber } })) {
        bookingNumber = generateBookingNumber();
      }

      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          customerId,
          vehicleId: vehicleRecord.id,
          serviceId: service.id,
          scheduledDate: d.schedule.scheduledDate,
          slotId: slot.id,
          timeSlotLabel: slot.label,
          status: "PENDING",
          paymentOption: d.paymentOption,
          servicePrice: plan.servicePrice,
          amountToPayNow: plan.amountToPayNow,
          amountPaid: 0,
          paymentStatus: "UNPAID",
          address: d.location.address,
          city: d.location.city,
          state: d.location.state,
          postalCode: d.location.postalCode,
          latitude: d.location.latitude ?? null,
          longitude: d.location.longitude ?? null,
          contactName: d.customer.fullName,
          contactEmail: d.customer.email,
          contactPhone: d.customer.phone,
          contactWhatsapp: d.customer.whatsappNumber || d.customer.phone,
          customerNotes: d.customerNotes || d.vehicle?.notes || null,
        },
        include: {
          service: true,
          vehicle: true,
        },
      });

      let payment = null;
      if (plan.amountToPayNow > 0) {
        payment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            customerId,
            transactionId: generateTransactionId("INIT"),
            gateway: process.env.STRIPE_SECRET_KEY ? "STRIPE" : "SANDBOX_CARD",
            paymentMode: d.paymentOption,
            amount: plan.amountToPayNow,
            currency: settings.currency,
            status: "PENDING",
          },
        });
      }

      await tx.bookingActivity.create({
        data: {
          bookingId: booking.id,
          actorId: customerId,
          actorRole: currentUser.role,
          action: "BOOKING_CREATED",
          toStatus: "PENDING",
          details: `Booking ${booking.bookingNumber} created for ${service.name} (${d.paymentOption}).`,
        },
      });

      return { booking, payment, settings };
    });

    if (newlyCreatedSessionToken) {
      await setSessionCookie(newlyCreatedSessionToken);
    }

    await notifyBookingCreated(result.booking.id);

    // Prepare payment intent/token if online payment is required
    let paymentIntent: {
      paymentId: string;
      amount: number;
      currency: string;
      gateway: "STRIPE" | "SANDBOX_CARD";
      verificationToken?: string;
      checkoutUrl?: string;
    } | null = null;

    if (result.payment) {
      const stripe = getStripeClient();
      if (stripe) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: result.booking.contactEmail,
          line_items: [
            {
              price_data: {
                currency: result.settings.currency.toLowerCase(),
                unit_amount: Math.round(result.payment.amount * 100),
                product_data: {
                  name: `${result.booking.service.name} (${result.booking.bookingNumber})`,
                  description: `${result.booking.vehicle.manufacturingYear} ${result.booking.vehicle.manufacturer} ${result.booking.vehicle.model}`,
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            bookingId: result.booking.id,
            paymentId: result.payment.id,
          },
          success_url: `${appUrl}/book?step=7&bookingId=${result.booking.id}&paymentId=${result.payment.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/book?step=6&bookingId=${result.booking.id}&cancelled=1`,
        });
        paymentIntent = {
          paymentId: result.payment.id,
          amount: result.payment.amount,
          currency: result.payment.currency,
          gateway: "STRIPE",
          checkoutUrl: session.url || undefined,
        };
      } else {
        const verificationToken = createPaymentVerificationToken({
          bookingId: result.booking.id,
          paymentId: result.payment.id,
          amount: result.payment.amount,
        });
        paymentIntent = {
          paymentId: result.payment.id,
          amount: result.payment.amount,
          currency: result.payment.currency,
          gateway: "SANDBOX_CARD",
          verificationToken,
        };
      }
    }

    return NextResponse.json(
      {
        booking: result.booking,
        paymentIntent,
        authenticatedUser: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create booking error:", err);
    const message = err instanceof Error ? err.message : "Failed to create booking.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

