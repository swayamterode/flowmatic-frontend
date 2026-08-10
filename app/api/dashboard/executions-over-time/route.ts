import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { dashboardService } from "@/services/dashboard.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days"));

  if (!Number.isInteger(days) || days <= 0) {
    return NextResponse.json({ error: "days must be a positive integer." }, { status: 400 });
  }

  try {
    const { data, session } = await withAccessToken((token) =>
      dashboardService.getExecutionsOverTime(days, token),
    );

    const response = NextResponse.json(data);
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not load execution history.");
  }
}
