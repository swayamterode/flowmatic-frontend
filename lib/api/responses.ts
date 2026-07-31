import { NextResponse } from "next/server";

import { ApiError } from "./client";

/**
 * The single place a backend failure becomes a client-facing response, so that
 * every Route Handler stays a three-liner.
 *
 * Spring's 4xx messages are written for humans ("Invalid credentials", "Invalid
 * or expired OTP") and are forwarded as-is — the login page depends on the
 * status to route unverified accounts. Anything else, including every 5xx, is
 * swallowed into a generic 502 so internal detail never reaches the browser.
 */
export function errorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof ApiError && error.status < 500) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("[api] upstream request failed", error);
  return NextResponse.json({ error: fallback }, { status: 502 });
}
