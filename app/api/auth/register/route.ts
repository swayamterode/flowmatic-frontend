import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { authService } from "@/services/auth.service";
import type { RegisterRequest } from "@/types/auth.types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterRequest;
    const data = await authService.register(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not create your account.");
  }
}
