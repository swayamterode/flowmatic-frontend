import { ExecutionsByStatusChart } from "@/components/dashboard/executions-by-status-chart";
import { ExecutionsOverTimeChart } from "@/components/dashboard/executions-over-time-chart";
import { DashboardStats } from "@/components/dashboard/stats";

import { HelloIcon } from "../icons/hello-icon";

export function Dashboard() {
  return (
    <div>
      <div className="flex items-center gap-2 p-6">
        <HelloIcon className="size-5 text-muted-foreground" />
        <h1 className="text-base font-medium">Welcome back</h1>
      </div>
      <div className="grid grid-cols-1 gap-6 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStats />
        <ExecutionsOverTimeChart />
        <ExecutionsByStatusChart />
      </div>
    </div>
  );
}
