import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { REFRESH_TOKEN_COOKIE, SESSION_COOKIES, sessionCookieWrites } from "@/lib/auth/cookies";
import { authService } from "@/services/auth.service";
import type { SessionUser } from "@/types/auth.types";

const EXPIRED = "Your session expired. Please sign in again.";

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: EXPIRED }, { status: 401 });
  }

  try {
    const auth = await authService.refresh(refreshToken);

    const user: SessionUser = { email: auth.email, fullName: auth.fullName };
    const response = NextResponse.json({ user });

    for (const { name, value, options } of sessionCookieWrites(auth)) {
      response.cookies.set(name, value, options);
    }

    return response;
  } catch {
    const response = NextResponse.json({ error: EXPIRED }, { status: 401 });
    for (const name of SESSION_COOKIES) {
      response.cookies.delete({ name, path: "/" });
    }
    return response;
  }
}
