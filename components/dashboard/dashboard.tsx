import { BusiestWorkflows } from "@/components/dashboard/busiest-workflows";
import { ExecutionsByStatusChart } from "@/components/dashboard/executions-by-status-chart";
import { ExecutionsOverTimeChart } from "@/components/dashboard/executions-over-time-chart";
import { FailuresByCauseChart } from "@/components/dashboard/failures-by-cause-chart";
import { RecentExecutions } from "@/components/dashboard/recent-executions";
import { RunDurationChart } from "@/components/dashboard/run-duration-chart";
import { DashboardStats } from "@/components/dashboard/stats";
import { WorkflowActivity } from "@/components/dashboard/workflow-activity";

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardStats />
      <ExecutionsOverTimeChart />
      <ExecutionsByStatusChart />
      {/* <FailuresByCauseChart />
      <RunDurationChart />
      <BusiestWorkflows />
      <RecentExecutions />
      <WorkflowActivity /> */}
    </div>
  );
}
