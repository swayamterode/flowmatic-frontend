import { NextResponse, type NextRequest } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";

const AUTH_ROUTES = ["/login", "/signup", "/verify-email"];

export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has(REFRESH_TOKEN_COOKIE);
  const { pathname } = request.nextUrl;
  const onAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!signedIn && !onAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (signedIn && onAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
