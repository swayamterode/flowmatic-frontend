export type WorkflowPlan = "ESSENTIALS" | "PRO" | "ENTERPRISE" | null;

export interface WorkflowUsage {
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  plan: WorkflowPlan;
}
