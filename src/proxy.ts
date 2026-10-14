import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/api/session";

// Optimistic redirects only: this checks that a session cookie exists, not
// that it is valid. The merchant layout verifies the session on the server.

const guestOnly = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isGuestRoute = guestOnly.includes(pathname);

  if (!hasSession && !isGuestRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isGuestRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/setup",
    "/dashboard/:path*",
    "/payments/:path*",
    "/qr/:path*",
    "/settings/:path*",
  ],
};
