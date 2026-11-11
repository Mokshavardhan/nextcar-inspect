import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireApiUser } from "@/lib/auth";

export async function GET() {
  const [settings, slots, blockedDates, currentUser] = await Promise.all([
    prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
    prisma.availabilitySlot.findMany({ orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] }),
    prisma.blockedDate.findMany({ orderBy: { dateStr: "asc" } }),
    getCurrentUser(),
  ]);

  const isAdmin = currentUser?.role === "ADMIN";
  return NextResponse.json({
    settings,
    ...(isAdmin ? { slots, blockedDates } : {}),
    integrations: isAdmin
      ? {
          stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
          smtpConfigured: Boolean(
            process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
          ),
          whatsappConfigured: Boolean(
            (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
              (process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
          ),
        }
      : undefined,
  });
}

const patchSettingsSchema = z.object({
  companyName: z.string().trim().min(2).optional(),
  companyTagline: z.string().trim().optional(),
  companyEmail: z.string().trim().email().optional(),
  companyPhone: z.string().trim().min(5).optional(),
  companyAddress: z.string().trim().optional(),
  allowFullPayment: z.boolean().optional(),
  allowAdvancePayment: z.boolean().optional(),
  advancePercentage: z.coerce.number().int().min(5).max(95).optional(),
  allowPayLater: z.boolean().optional(),
  cancellationWindowHours: z.coerce.number().int().min(0).max(168).optional(),
  rescheduleWindowHours: z.coerce.number().int().min(0).max(168).optional(),
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  addSlot: z
    .object({
      label: z.string().trim().min(3),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      maxBookingsPerSlot: z.coerce.number().int().min(1).max(50),
    })
    .optional(),
  toggleSlotId: z.string().optional(),
  updateSlotCapacity: z
    .object({
      id: z.string(),
      maxBookingsPerSlot: z.coerce.number().int().min(1).max(50),
    })
    .optional(),
  addBlockedDate: z
    .object({
      dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().trim().optional(),
    })
    .optional(),
  removeBlockedDateId: z.string().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiUser(["ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = patchSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid settings payload" },
        { status: 400 }
      );
    }

    const d = parsed.data;

    if (d.addSlot) {
      const count = await prisma.availabilitySlot.count();
      await prisma.availabilitySlot.create({
        data: {
          label: d.addSlot.label,
          startTime: d.addSlot.startTime,
          endTime: d.addSlot.endTime,
          maxBookingsPerSlot: d.addSlot.maxBookingsPerSlot,
          sortOrder: count + 1,
        },
      });
    }

    if (d.toggleSlotId) {
      const existing = await prisma.availabilitySlot.findUnique({ where: { id: d.toggleSlotId } });
      if (existing) {
        await prisma.availabilitySlot.update({
          where: { id: d.toggleSlotId },
          data: { isActive: !existing.isActive },
        });
      }
    }

    if (d.updateSlotCapacity) {
      await prisma.availabilitySlot.update({
        where: { id: d.updateSlotCapacity.id },
        data: { maxBookingsPerSlot: d.updateSlotCapacity.maxBookingsPerSlot },
      });
    }

    if (d.addBlockedDate) {
      await prisma.blockedDate.upsert({
        where: { dateStr: d.addBlockedDate.dateStr },
        update: { reason: d.addBlockedDate.reason || null },
        create: {
          dateStr: d.addBlockedDate.dateStr,
          reason: d.addBlockedDate.reason || null,
        },
      });
    }

    if (d.removeBlockedDateId) {
      await prisma.blockedDate.delete({ where: { id: d.removeBlockedDateId } }).catch(() => null);
    }

    const {
      addSlot: _a,
      toggleSlotId: _b,
      updateSlotCapacity: _c,
      addBlockedDate: _d,
      removeBlockedDateId: _e,
      ...platformFields
    } = d;

    const settings = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: platformFields,
      create: { id: "default", ...platformFields },
    });

    const [slots, blockedDates] = await Promise.all([
      prisma.availabilitySlot.findMany({ orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] }),
      prisma.blockedDate.findMany({ orderBy: { dateStr: "asc" } }),
    ]);

    return NextResponse.json({ settings, slots, blockedDates });
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json({ error: "Failed to update platform settings" }, { status: 500 });
  }
}

