import { NextResponse } from "next/server";

import { SESSION_COOKIES } from "@/lib/auth/cookies";

export async function POST() {
  const response = NextResponse.json({ success: true });
  for (const name of SESSION_COOKIES) {
    response.cookies.delete({ name, path: "/" });
  }
  return response;
}
