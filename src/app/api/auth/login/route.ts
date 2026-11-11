import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  signSessionToken,
  setSessionCookie,
  getDashboardPathForRole,
} from "@/lib/auth";
import type { UserRole } from "@/lib/constants";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid credentials" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account has been deactivated. Contact support or administrator." },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      name: user.name,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        whatsappNumber: user.whatsappNumber,
      },
      redirectTo: getDashboardPathForRole(user.role),
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Sign in failed. Please try again." }, { status: 500 });
  }
}

