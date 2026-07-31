"use client";

import { createContext, useContext } from "react";

import type { SessionUser } from "@/types/auth.types";

/**
 * Carries the signed-in user from the server layout, which read the httpOnly
 * cookie, down to the client components that display it. No fetching and no
 * loading state: the value is already correct on first paint.
 */
const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/**
 * The signed-in user, never null. Throwing on a missing provider is what buys
 * that guarantee — a component outside the authed layout has no session to show,
 * and that is a wiring mistake to fix, not a state to render around.
 */
export function useSessionUser(): SessionUser {
  const user = useContext(SessionContext);

  if (!user) {
    throw new Error("useSessionUser must be used inside a SessionProvider.");
  }
  return user;
}
