import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { formatCurrency } from "./format";

export interface DispatchNotificationInput {
  userId?: string | null;
  bookingId?: string | null;
  eventType: string;
  subject: string;
  message: string;
  email?: string | null;
  whatsappNumber?: string | null;
  sendInApp?: boolean;
}

async function getSettings() {
  return prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

async function sendEmailViaSmtp(to: string, subject: string, textBody: string, companyName: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const from = process.env.SMTP_FROM || `${companyName} <notifications@nextcarinspect.in>`;

  if (!host || !user || !pass) {
    return {
      status: "SIMULATED" as const,
      errorMessage: null,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const htmlBody = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #101B35; padding: 20px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; letter-spacing: -0.01em;">${companyName}</h2>
        </div>
        <div style="padding: 24px; color: #172033; line-height: 1.6; background: #ffffff;">
          <h3 style="margin-top: 0; color: #101B35;">${subject}</h3>
          <p style="white-space: pre-line;">${textBody}</p>
        </div>
        <div style="padding: 16px 24px; background: #F8FAFC; color: #64748B; font-size: 12px; border-top: 1px solid #e2e8f0;">
          Automated notification from ${companyName}
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to,
      subject: `[${companyName}] ${subject}`,
      text: textBody,
      html: htmlBody,
    });

    return { status: "SENT" as const, errorMessage: null };
  } catch (err) {
    return {
      status: "FAILED" as const,
      errorMessage: err instanceof Error ? err.message : "SMTP delivery failed",
    };
  }
}

async function sendWhatsAppMessage(toNumber: string, textBody: string) {
  const cleanNumber = toNumber.trim();
  if (!cleanNumber) {
    return { status: "FAILED" as const, errorMessage: "Missing WhatsApp number" };
  }

  // Option A: Twilio WhatsApp API
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const toFormatted = cleanNumber.startsWith("whatsapp:")
        ? cleanNumber
        : `whatsapp:${cleanNumber.startsWith("+") ? cleanNumber : `+${cleanNumber}`}`;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const body = new URLSearchParams({
        From: twilioFrom,
        To: toFormatted,
        Body: textBody,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        return { status: "FAILED" as const, errorMessage: `Twilio error: ${text}` };
      }
      return { status: "SENT" as const, errorMessage: null };
    } catch (err) {
      return {
        status: "FAILED" as const,
        errorMessage: err instanceof Error ? err.message : "Twilio request failed",
      };
    }
  }

  // Option B: Meta WhatsApp Cloud API
  const waToken = process.env.WHATSAPP_CLOUD_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (waToken && waPhoneId) {
    try {
      const digitsOnly = cleanNumber.replace(/[^\d]/g, "");
      const res = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: digitsOnly,
          type: "text",
          text: { body: textBody },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { status: "FAILED" as const, errorMessage: `WhatsApp Cloud error: ${text}` };
      }
      return { status: "SENT" as const, errorMessage: null };
    } catch (err) {
      return {
        status: "FAILED" as const,
        errorMessage: err instanceof Error ? err.message : "WhatsApp Cloud request failed",
      };
    }
  }

  // Fallback local/sandbox mode when external WhatsApp credentials aren't configured
  return { status: "SIMULATED" as const, errorMessage: null };
}

export async function dispatchNotification(input: DispatchNotificationInput) {
  const settings = await getSettings();
  const records: Array<{
    userId?: string | null;
    bookingId?: string | null;
    channel: string;
    eventType: string;
    recipientAddress?: string | null;
    subject: string;
    message: string;
    status: string;
    errorMessage?: string | null;
  }> = [];

  if (input.sendInApp !== false && input.userId) {
    records.push({
      userId: input.userId,
      bookingId: input.bookingId ?? null,
      channel: "IN_APP",
      eventType: input.eventType,
      recipientAddress: input.email || input.userId,
      subject: input.subject,
      message: input.message,
      status: "SENT",
    });
  }

  if (settings.emailEnabled && input.email) {
    const emailResult = await sendEmailViaSmtp(
      input.email,
      input.subject,
      input.message,
      settings.companyName
    );
    records.push({
      userId: input.userId ?? null,
      bookingId: input.bookingId ?? null,
      channel: "EMAIL",
      eventType: input.eventType,
      recipientAddress: input.email,
      subject: input.subject,
      message: input.message,
      status: emailResult.status,
      errorMessage: emailResult.errorMessage,
    });
  }

  if (settings.whatsappEnabled && input.whatsappNumber) {
    const waResult = await sendWhatsAppMessage(
      input.whatsappNumber,
      `*${settings.companyName} — ${input.subject}*\n\n${input.message}`
    );
    records.push({
      userId: input.userId ?? null,
      bookingId: input.bookingId ?? null,
      channel: "WHATSAPP",
      eventType: input.eventType,
      recipientAddress: input.whatsappNumber,
      subject: input.subject,
      message: input.message,
      status: waResult.status,
      errorMessage: waResult.errorMessage,
    });
  }

  if (records.length > 0) {
    await prisma.notification.createMany({ data: records });
  }
}

async function notifyAllAdmins(params: {
  bookingId?: string;
  eventType: string;
  subject: string;
  message: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, email: true, whatsappNumber: true },
  });

  await Promise.all(
    admins.map((admin) =>
      dispatchNotification({
        userId: admin.id,
        bookingId: params.bookingId,
        eventType: params.eventType,
        subject: params.subject,
        message: params.message,
        email: admin.email,
        whatsappNumber: admin.whatsappNumber,
      })
    )
  );
}

export async function notifyBookingCreated(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, vehicle: true },
  });
  if (!booking) return;

  await dispatchNotification({
    userId: booking.customerId,
    bookingId: booking.id,
    eventType: "BOOKING_RECEIVED",
    subject: `Booking Received: ${booking.bookingNumber}`,
    message: `Hello ${booking.contactName}, your ${booking.service.name} booking (${booking.bookingNumber}) for your ${booking.vehicle.manufacturingYear} ${booking.vehicle.manufacturer} ${booking.vehicle.model} (${booking.vehicle.registrationNumber}) on ${booking.scheduledDate} (${booking.timeSlotLabel}) has been received.`,
    email: booking.contactEmail,
    whatsappNumber: booking.contactWhatsapp || booking.contactPhone,
  });

  await notifyAllAdmins({
    bookingId: booking.id,
    eventType: "NEW_BOOKING_RECEIVED",
    subject: `New Booking ${booking.bookingNumber}`,
    message: `${booking.contactName} booked ${booking.service.name} for ${booking.vehicle.manufacturer} ${booking.vehicle.model} (${booking.vehicle.registrationNumber}) on ${booking.scheduledDate} (${booking.timeSlotLabel}).`,
  });
}

export async function notifyBookingConfirmed(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });
  if (!booking) return;

  await dispatchNotification({
    userId: booking.customerId,
    bookingId: booking.id,
    eventType: "BOOKING_CONFIRMED",
    subject: `Booking Confirmed: ${booking.bookingNumber}`,
    message: `Your ${booking.service.name} booking (${booking.bookingNumber}) scheduled for ${booking.scheduledDate} (${booking.timeSlotLabel}) is confirmed. We will notify you once a certified technician is assigned.`,
    email: booking.contactEmail,
    whatsappNumber: booking.contactWhatsapp || booking.contactPhone,
  });
}

export async function notifyPaymentReceived(bookingId: string, amount: number, transactionId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });
  if (!booking) return;

  const formatted = formatCurrency(amount);
  await dispatchNotification({
    userId: booking.customerId,
    bookingId: booking.id,
    eventType: "PAYMENT_RECEIVED",
    subject: `Payment Receipt: ${booking.bookingNumber}`,
    message: `We received your payment of ${formatted} (Transaction ID: ${transactionId}) for booking ${booking.bookingNumber} (${booking.service.name}).`,
    email: booking.contactEmail,
    whatsappNumber: booking.contactWhatsapp || booking.contactPhone,
  });

  await notifyAllAdmins({
    bookingId: booking.id,
    eventType: "PAYMENT_RECEIVED",
    subject: `Payment Received (${formatted}) — ${booking.bookingNumber}`,
    message: `Payment of ${formatted} verified for booking ${booking.bookingNumber} from ${booking.contactName}. Transaction ID: ${transactionId}.`,
  });
}

export async function notifyTechnicianAssigned(bookingId: string, technicianId: string) {
  const [booking, technician] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, vehicle: true },
    }),
    prisma.user.findUnique({
      where: { id: technicianId },
      select: { id: true, name: true, email: true, phone: true, whatsappNumber: true },
    }),
  ]);
  if (!booking || !technician) return;

  await dispatchNotification({
    userId: booking.customerId,
    bookingId: booking.id,
    eventType: "TECHNICIAN_ASSIGNED",
    subject: `Technician Assigned: ${booking.bookingNumber}`,
    message: `Certified inspector ${technician.name} (${technician.phone || "Contact via dashboard"}) has been assigned to your ${booking.service.name} on ${booking.scheduledDate} (${booking.timeSlotLabel}).`,
    email: booking.contactEmail,
    whatsappNumber: booking.contactWhatsapp || booking.contactPhone,
  });

  await dispatchNotification({
    userId: technician.id,
    bookingId: booking.id,
    eventType: "NEW_INSPECTION_ASSIGNED",
    subject: `New Inspection Assigned: ${booking.bookingNumber}`,
    message: `You have been assigned to inspect ${booking.vehicle.manufacturingYear} ${booking.vehicle.manufacturer} ${booking.vehicle.model} (${booking.vehicle.registrationNumber}) for ${booking.contactName} on ${booking.scheduledDate} (${booking.timeSlotLabel}) at ${booking.address}, ${booking.city}.`,
    email: technician.email,
    whatsappNumber: technician.whatsappNumber || technician.phone,
  });
}

export async function notifyBookingRescheduled(bookingId: string, newDate: string, newSlot: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      assignments: { where: { isActive: true }, include: { technician: true } },
    },
  });
  if (!booking) return;

  await dispatchNotification({
    userId: booking.customerId,
    bookingId: booking.id,
    eventType: "BOOKING_RESCHEDULED",
    subject: `Booking Rescheduled: ${booking.bookingNumber}`,
    message: `Your inspection booking ${booking.bookingNumber} has been rescheduled to ${newDate} (${newSlot}).`,
    email: booking.contactEmail,
    whatsappNumber: booking.contactWhatsapp || booking.contactPhone,
  });

  const activeTech = booking.assignments[0]?.technician;
  if (activeTech) {
    await dispatchNotification({
      userId: activeTech.id,
      bookingId: booking.id,
      eventType: "INSPECTION_RESCHEDULED",
      subject: `Inspection Rescheduled: ${booking.bookingNumber}`,
      message: `Assigned inspection ${booking.bookingNumber} has been rescheduled to ${newDate} (${newSlot}).`,
      email: activeTech.email,
      whatsappNumber: activeTech.whatsappNumber || activeTech.phone,
    });
  }
}

export async function notifyBookingCancelled(bookingId: string, reason?: string | null) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      assignments: { where: { isActive: true }, include: { technician: true } },
    },
  });
  if (!booking) return;

  const reasonSuffix = reason ? ` Reason: ${reason}` : "";

  await dispatchNotification({
    userId: booking.customerId,
    bookingId: booking.id,
    eventType: "BOOKING_CANCELLED",
    subject: `Booking Cancelled: ${booking.bookingNumber}`,
    message: `Your inspection booking ${booking.bookingNumber} has been cancelled.${reasonSuffix}`,
    email: booking.contactEmail,
    whatsappNumber: booking.contactWhatsapp || booking.contactPhone,
  });

  const activeTech = booking.assignments[0]?.technician;
  if (activeTech) {
    await dispatchNotification({
      userId: activeTech.id,
      bookingId: booking.id,
      eventType: "INSPECTION_CANCELLED",
      subject: `Inspection Cancelled: ${booking.bookingNumber}`,
      message: `Your assigned inspection ${booking.bookingNumber} on ${booking.scheduledDate} has been cancelled.${reasonSuffix}`,
      email: activeTech.email,
      whatsappNumber: activeTech.whatsappNumber || activeTech.phone,
    });
  }
}

export async function notifyInspectionSubmitted(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vehicle: true, service: true },
  });
  if (!booking) return;

  await dispatchNotification({
    userId: booking.customerId,
    bookingId: booking.id,
    eventType: "INSPECTION_COMPLETED",
    subject: `Inspection Completed & Under Review: ${booking.bookingNumber}`,
    message: `Our technician has completed the physical inspection of your ${booking.vehicle.manufacturer} ${booking.vehicle.model} (${booking.vehicle.registrationNumber}). Your findings are now under quality review by our senior team.`,
    email: booking.contactEmail,
    whatsappNumber: booking.contactWhatsapp || booking.contactPhone,
  });

  await notifyAllAdmins({
    bookingId: booking.id,
    eventType: "INSPECTION_SUBMITTED",
    subject: `Inspection Ready for Review: ${booking.bookingNumber}`,
    message: `Technician findings for ${booking.bookingNumber} (${booking.vehicle.manufacturer} ${booking.vehicle.model}) have been submitted and moved to Under Review.`,
  });
}

export async function notifyRevisionRequested(bookingId: string, technicianId: string, notes: string) {
  const [booking, technician] = await Promise.all([
    prisma.booking.findUnique({ where: { id: bookingId } }),
    prisma.user.findUnique({
      where: { id: technicianId },
      select: { id: true, email: true, phone: true, whatsappNumber: true },
    }),
  ]);
  if (!booking || !technician) return;

  await dispatchNotification({
    userId: technician.id,
    bookingId: booking.id,
    eventType: "REVISION_REQUESTED",
    subject: `Revision Requested: ${booking.bookingNumber}`,
    message: `Admin quality review requested corrections on inspection ${booking.bookingNumber}: "${notes}". Please update and resubmit.`,
    email: technician.email,
    whatsappNumber: technician.whatsappNumber || technician.phone,
  });
}

export async function notifyReportApprovedAndDelivered(bookingId: string, reportNumber: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vehicle: true, service: true },
  });
  if (!booking) return;

  await dispatchNotification({
    userId: booking.customerId,
    bookingId: booking.id,
    eventType: "REPORT_APPROVED",
    subject: `Inspection Report Ready: ${reportNumber}`,
    message: `Great news! Your ${booking.service.name} report (${reportNumber}) for ${booking.vehicle.manufacturingYear} ${booking.vehicle.manufacturer} ${booking.vehicle.model} has been approved and delivered. Sign in to your Customer Dashboard to download your official PDF report.`,
    email: booking.contactEmail,
    whatsappNumber: booking.contactWhatsapp || booking.contactPhone,
  });
}

export async function checkAndNotifyOverdueInspections() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  const overdueBookings = await prisma.booking.findMany({
    where: {
      scheduledDate: { lt: todayStr },
      status: { in: ["PENDING", "CONFIRMED", "TECHNICIAN_ASSIGNED", "INSPECTION_STARTED"] },
    },
    include: { vehicle: true },
    take: 25,
  });

  for (const booking of overdueBookings) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        bookingId: booking.id,
        eventType: "INSPECTION_OVERDUE",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!alreadyNotified) {
      await notifyAllAdmins({
        bookingId: booking.id,
        eventType: "INSPECTION_OVERDUE",
        subject: `Overdue Inspection Alert: ${booking.bookingNumber}`,
        message: `Booking ${booking.bookingNumber} (${booking.vehicle.manufacturer} ${booking.vehicle.model}) scheduled for ${booking.scheduledDate} (${booking.timeSlotLabel}) is still in status ${booking.status}.`,
      });
    }
  }
  return overdueBookings.length;
}

