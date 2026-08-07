import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { runService } from "@/services/run.service";

export async function GET() {
  try {
    const { data, session } = await withAccessToken((token) => runService.getUsage(token));

    const response = NextResponse.json(data);
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not load your usage.");
  }
}
