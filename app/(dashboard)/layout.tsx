import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/components/session-provider";

/**
 * The authenticated shell. Reading the session here rather than in the header
 * means the account menu renders the right person on the first paint, with no
 * fetch and no placeholder flash.
 *
 * The redirect is a narrow safety net, not a second guard: proxy.ts gates on the
 * refresh cookie, so a session missing only its `sessionUser` cookie would
 * otherwise reach the UI with nobody to show. Bouncing here also means every
 * component below can treat the user as present.
 *
 * The provider wraps AppShell, not children — NavUser lives in the header, above
 * the page.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <SessionProvider user={user}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
