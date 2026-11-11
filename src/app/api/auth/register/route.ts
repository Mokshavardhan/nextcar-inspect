import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signSessionToken, setSessionCookie } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().trim().min(7, "Please enter a valid mobile number"),
  whatsappNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid registration details" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: "CUSTOMER",
        phone: data.phone,
        whatsappNumber: data.whatsappNumber || data.phone,
        isActive: true,
        customerProfile: {
          create: {
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            postalCode: data.postalCode || null,
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
      },
    });

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      role: "CUSTOMER",
      name: user.name,
    });
    await setSessionCookie(token);

    return NextResponse.json({ user, redirectTo: "/dashboard/customer" }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}

