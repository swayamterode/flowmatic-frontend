import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { billingService } from "@/services/billing.service";
import type { CheckoutSessionRequest } from "@/types/billing.types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutSessionRequest;
    const { data, session } = await withAccessToken((token) =>
      billingService.createCheckoutSession(body.plan, token),
    );

    const response = NextResponse.json(data);
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not start checkout. Try again in a moment.");
  }
}
