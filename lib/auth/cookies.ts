import type { AuthResponse, SessionUser } from "@/types/auth.types";

/**
 * The session cookie contract. This module exports names, options and codecs —
 * never a setter — because Route Handlers are the only layer allowed to call
 * cookies().set, and keeping the write in the handler keeps it auditable.
 */

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";
export const SESSION_USER_COOKIE = "sessionUser";

/**
 * The refresh token outlives the access token (which expires per the backend's
 * expiresInSeconds) and is rotated on every use. It doubles as the signal that
 * a session exists, since the access token may legitimately be expired.
 */
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

export function sessionCookie(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  } as const;
}

export const SESSION_COOKIES = [
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_USER_COOKIE,
] as const;

/**
 * The three cookies an AuthResponse translates into, as data. Every handler that
 * receives fresh tokens — login, refresh, and anything that refreshed
 * mid-request — writes exactly this set, so it is described once here and
 * applied by the caller. Still a descriptor rather than a setter: the
 * `cookies.set` calls stay visible in the Route Handler.
 */
export function sessionCookieWrites(auth: AuthResponse) {
  const user: SessionUser = { email: auth.email, fullName: auth.fullName };

  return [
    {
      name: ACCESS_TOKEN_COOKIE,
      value: auth.accessToken,
      options: sessionCookie(auth.expiresInSeconds),
    },
    {
      name: REFRESH_TOKEN_COOKIE,
      value: auth.refreshToken,
      options: sessionCookie(REFRESH_TOKEN_MAX_AGE),
    },
    {
      name: SESSION_USER_COOKIE,
      value: encodeSessionUser(user),
      options: sessionCookie(REFRESH_TOKEN_MAX_AGE),
    },
  ] as const;
}

export function encodeSessionUser(user: SessionUser): string {
  return JSON.stringify(user);
}

/** Tolerates a missing or malformed cookie by reporting "no session". */
export function decodeSessionUser(raw: string | undefined): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (!parsed.email || !parsed.fullName) return null;
    return { email: parsed.email, fullName: parsed.fullName };
  } catch {
    return null;
  }
}
