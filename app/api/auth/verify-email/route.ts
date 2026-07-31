import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { authService } from "@/services/auth.service";
import type { VerifyEmailRequest } from "@/types/auth.types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyEmailRequest;
    const data = await authService.verifyEmail(body);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error, "Could not verify the code.");
  }
}
