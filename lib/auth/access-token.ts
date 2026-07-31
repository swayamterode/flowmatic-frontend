import { cookies } from "next/headers";

import { ApiError } from "@/lib/api/client";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { authService } from "@/services/auth.service";
import type { AuthResponse } from "@/types/auth.types";

export const SESSION_EXPIRED = "Your session expired. Please sign in again.";

export type AuthedResult<T> = {
  data: T;
  /** Present when this call had to refresh; the handler must write these cookies. */
  session?: AuthResponse;
};

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

/**
 * `call` may run twice, so it must be replayable — building a request body from
 * a File is fine (a Blob can be read more than once), consuming a stream is not.
 */
export async function withAccessToken<T>(
  call: (token: string) => Promise<T>,
): Promise<AuthedResult<T>> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  if (accessToken) {
    try {
      return { data: await call(accessToken) };
    } catch (error) {
      // Anything but a 401 is the backend's answer, not an auth problem.
      if (!isUnauthorized(error)) throw error;
    }
  }

  if (!refreshToken) throw new ApiError(SESSION_EXPIRED, 401);

  let session: AuthResponse;
  try {
    session = await authService.refresh(refreshToken);
  } catch {
    // Deliberately not forwarded: whatever the backend said about the refresh
    // token, what the user needs to know is that they have to sign in again.
    throw new ApiError(SESSION_EXPIRED, 401);
  }

  return { data: await call(session.accessToken), session };
}
