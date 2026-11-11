import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notifications";

const contactSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  subject: z.string().trim().min(3),
  message: z.string().trim().min(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Please complete all required fields" },
        { status: 400 }
      );
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true, email: true },
    });
    await Promise.all(
      admins.map((admin) =>
        dispatchNotification({
          userId: admin.id,
          eventType: "CONTACT_INQUIRY",
          subject: `New Contact Inquiry: ${inquiry.subject}`,
          message: `From ${inquiry.name} (${inquiry.email}${inquiry.phone ? `, ${inquiry.phone}` : ""}):\n${inquiry.message}`,
          email: admin.email,
        })
      )
    );

    return NextResponse.json({ inquiry, success: true }, { status: 201 });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Unable to send inquiry right now" }, { status: 500 });
  }
}

