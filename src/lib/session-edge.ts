import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "./constants";

export const SESSION_COOKIE_NAME = "nextcar_session";

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET || "nextcar-inspect-local-dev-secret-change-in-production-2026";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || !payload.role || !payload.email) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: String(payload.role) as UserRole,
      name: String(payload.name || ""),
    };
  } catch {
    return null;
  }
}

export function getDashboardPathForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "TECHNICIAN":
      return "/dashboard/technician";
    default:
      return "/dashboard/customer";
  }
}

