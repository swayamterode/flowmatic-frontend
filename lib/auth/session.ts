import { cookies } from "next/headers";

import { SESSION_USER_COOKIE, decodeSessionUser } from "@/lib/auth/cookies";
import type { SessionUser } from "@/types/auth.types";

/**
 * The one place that reads the signed-in user off the cookie jar. Server-only —
 * the cookie is httpOnly, so this cannot and must not run in the browser.
 *
 * There is no backend call here on purpose: `sessionUser` was written by our own
 * Route Handlers at login and refresh, so the display name is already on the
 * request. Nothing to fetch, nothing to keep in sync.
 *
 * Returns null for a missing or malformed cookie; callers decide whether that
 * means "redirect to login" or "401".
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return decodeSessionUser(store.get(SESSION_USER_COOKIE)?.value);
}
