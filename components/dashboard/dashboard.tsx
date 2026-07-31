import { BusiestWorkflows } from "@/components/dashboard/busiest-workflows";
import { ExecutionsOverTimeChart } from "@/components/dashboard/executions-over-time-chart";
import { FailuresByCauseChart } from "@/components/dashboard/failures-by-cause-chart";
import { RecentExecutions } from "@/components/dashboard/recent-executions";
import { RunDurationChart } from "@/components/dashboard/run-duration-chart";
import { DashboardStats } from "@/components/dashboard/stats";
import { TriggerBreakdownChart } from "@/components/dashboard/trigger-breakdown-chart";
import { WorkflowActivity } from "@/components/dashboard/workflow-activity";

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardStats />
      <ExecutionsOverTimeChart />
      <TriggerBreakdownChart />
      <FailuresByCauseChart />
      <RunDurationChart />
      <BusiestWorkflows />
      <RecentExecutions />
      <WorkflowActivity />
    </div>
  );
}
