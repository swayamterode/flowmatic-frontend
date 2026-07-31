import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";

/**
 * The client-facing read of the current session. Server components should call
 * getSessionUser() directly instead; this exists for client-side callers, which
 * cannot see the httpOnly cookie themselves.
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  return NextResponse.json({ user });
}
