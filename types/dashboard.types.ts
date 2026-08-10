import type { RunStatus } from "@/types/run.types";

/** One point in a daily execution-count series. Returned oldest first. */
export interface ExecutionsOverTimeDay {
  date: string;
  executions: number;
}

/** Execution count for one run status. All four statuses are always present, even at 0. */
export interface ExecutionsByStatusDatum {
  status: RunStatus;
  count: number;
}

/**
 * Today's headline metrics with period-over-period deltas. Delta fields are
 * `null` when there is no prior period to compare against. `successRatePct`
 * and `medianRunTimeSeconds` are `null` when there are no executions today
 * to compute a rate/median from — the UI treats that as `0`.
 */
export interface DashboardSummary {
  executionsToday: number;
  executionsTodayDeltaPct: number | null;
  successRatePct: number | null;
  successRateDeltaPp: number | null;
  failedRuns: number;
  failedRunsDeltaPct: number | null;
  medianRunTimeSeconds: number | null;
  medianRunTimeDeltaPct: number | null;
}
