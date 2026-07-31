import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { workflowService } from "@/services/workflow.service";
import type { UpdateWorkflowRequest } from "@/types/workflow.types";

/*
 * One workflow. A workflow the caller doesn't own answers 404 rather than 403 —
 * the backend hides existence on purpose, and that status is forwarded unchanged.
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const { data, session } = await withAccessToken((token) => workflowService.get(id, token));

    const response = NextResponse.json(data);
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not load that workflow.");
  }
}

/** Every field is optional — the editor sends only what changed. */
export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const body = (await request.json()) as UpdateWorkflowRequest;
    const { data, session } = await withAccessToken((token) =>
      workflowService.update(id, body, token),
    );

    const response = NextResponse.json(data);
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

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const { session } = await withAccessToken((token) => workflowService.remove(id, token));

    // The backend answers 200 with a human-readable "…deleted" message, which
    // nothing in the browser consumes — the list already knows which row went.
    // So it is normalized to 204 here, and route-client reads no body from it.
    const response = new NextResponse(null, { status: 204 });
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not delete that workflow.");
  }
}
