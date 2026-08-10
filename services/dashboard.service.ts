import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  DashboardSummary,
  ExecutionsByStatusDatum,
  ExecutionsOverTimeDay,
} from "@/types/dashboard.types";

/** Dashboard aggregates against Spring Boot. */
export const dashboardService = {
  /** Per-day execution counts for the trailing `days` window. */
  getExecutionsOverTime(days: number, token: string) {
    return apiClient<ExecutionsOverTimeDay[]>(ENDPOINTS.DASHBOARD.executionsOverTime(days), {
      token,
    });
  },
  /** Today's headline metrics with period-over-period deltas. */
  getSummary(token: string) {
    return apiClient<DashboardSummary>(ENDPOINTS.DASHBOARD.SUMMARY, { token });
  },
  /** Execution counts grouped by run status. */
  getExecutionsByStatus(token: string) {
    return apiClient<ExecutionsByStatusDatum[]>(ENDPOINTS.DASHBOARD.EXECUTIONS_BY_STATUS, {
      token,
    });
  },
};
