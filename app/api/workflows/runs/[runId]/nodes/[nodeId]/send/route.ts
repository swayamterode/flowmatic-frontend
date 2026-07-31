import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { runService } from "@/services/run.service";

/*
 * The manual-review "Send" action: actually sends every message an OUTPUT node held
 * for review, and answers the node's updated status/output. Nothing else on this
 * node's config (to/subject/body) is read here — this route only tells the run to
 * stop holding what it already resolved.
 *
 * A run or node that isn't the caller's, or that never held anything for review,
 * gets whatever status the backend answered (404/409) forwarded unchanged.
 */

type RouteContext = { params: Promise<{ runId: string; nodeId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { runId, nodeId } = await params;

  try {
    const { data, session } = await withAccessToken((token) =>
      runService.sendPending(runId, nodeId, token),
    );

    const response = NextResponse.json(data);
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not send those emails.");
  }
}
