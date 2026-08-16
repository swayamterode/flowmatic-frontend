import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/components/session-provider";
import { WorkflowUsageProvider } from "@/components/workflow-usage-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <SessionProvider user={user}>
      <WorkflowUsageProvider>
        <AppShell>{children}</AppShell>
      </WorkflowUsageProvider>
    </SessionProvider>
  );
}
