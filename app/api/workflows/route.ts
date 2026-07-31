import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { workflowService } from "@/services/workflow.service";
import type { CreateWorkflowRequest } from "@/types/workflow.types";

export async function GET() {
  try {
    const { data, session } = await withAccessToken((token) => workflowService.list(token));

    const response = NextResponse.json(data);
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not load your workflows.");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateWorkflowRequest;
    const { data, session } = await withAccessToken((token) => workflowService.create(body, token));

    const response = NextResponse.json(data, { status: 201 });
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not save that workflow.");
  }
}
