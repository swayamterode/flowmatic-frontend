import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { runService } from "@/services/run.service";

/*
 * One run, with a log row per node that was reached. Polled while a run is in
 * flight.
 *
 * `runs` is a static segment beside the `[id]` one next door, and Next resolves
 * static ahead of dynamic — so this handler owns /api/workflows/runs/... while
 * /api/workflows/{id} still reaches the workflow handler.
 *
 * A run belonging to someone else answers 404, as workflows do: the backend hides
 * existence, and that status is forwarded unchanged.
 */

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;

  try {
    const { data, session } = await withAccessToken((token) => runService.get(runId, token));

    const response = NextResponse.json(data);
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not load that run.");
  }
}
