import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { authService } from "@/services/auth.service";
import type { LoginRequest, SessionUser } from "@/types/auth.types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequest;
    const auth = await authService.login(body);

    const user: SessionUser = { email: auth.email, fullName: auth.fullName };
    const response = NextResponse.json({ user });

    for (const { name, value, options } of sessionCookieWrites(auth)) {
      response.cookies.set(name, value, options);
    }

    return response;
  } catch (error) {
    return errorResponse(error, "Could not sign you in.");
  }
}
