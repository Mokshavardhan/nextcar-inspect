import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  getDashboardPathForRole,
} from "@/lib/session-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/dashboard/admin") && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL(getDashboardPathForRole(session.role), request.url));
    }
    if (pathname.startsWith("/dashboard/technician") && session.role !== "TECHNICIAN") {
      return NextResponse.redirect(new URL(getDashboardPathForRole(session.role), request.url));
    }
    if (pathname.startsWith("/dashboard/customer") && session.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL(getDashboardPathForRole(session.role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
