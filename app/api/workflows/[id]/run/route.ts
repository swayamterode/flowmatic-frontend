import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { runService } from "@/services/run.service";

/*
 * Enqueues a run for one workflow.
 *
 * The 202 is forwarded rather than normalized to 200: it is the honest status, since
 * nothing has executed yet — the backend queues the run and its scheduler drains the
 * queue one at a time. The caller polls /api/workflows/runs/{runId} from here.
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const { data, session } = await withAccessToken((token) => runService.enqueue(id, token));

    const response = NextResponse.json(data, { status: 202 });
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not start that workflow.");
  }
}
