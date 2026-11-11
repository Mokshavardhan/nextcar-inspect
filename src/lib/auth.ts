import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import type { UserRole } from "./constants";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  getDashboardPathForRole,
  type SessionPayload,
} from "./session-edge";

export {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  getDashboardPathForRole,
  type SessionPayload,
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isHttps = (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://");
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
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

    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireApiUser(allowedRoles?: UserRole[]): Promise<
  | { user: AuthUser; errorResponse?: never }
  | { user?: never; errorResponse: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      ),
    };
  }
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden: insufficient permissions for this action." },
        { status: 403 }
      ),
    };
  }
  return { user };
}
