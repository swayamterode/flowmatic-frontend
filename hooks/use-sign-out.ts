"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { postRoute } from "@/lib/api/route-client";

/**
 * Signing out, kept out of the components that offer it. The Route Handler clears
 * the session cookies; this side owns what the user sees while that happens.
 *
 * `refresh()` follows the redirect deliberately — without it the router can serve
 * a cached authenticated page after the cookies are gone.
 */
export function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await postRoute("/api/auth/logout");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign you out.");
      setSigningOut(false);
    }
  }

  return { signOut, signingOut };
}
