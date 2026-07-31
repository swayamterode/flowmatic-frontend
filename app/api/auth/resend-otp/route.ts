import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { authService } from "@/services/auth.service";
import type { ResendOtpRequest } from "@/types/auth.types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResendOtpRequest;
    const data = await authService.resendOtp(body);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error, "Could not resend the code.");
  }
}
