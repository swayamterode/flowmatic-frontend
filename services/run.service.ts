import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { NodeRun, RunDetail, RunSummary } from "@/types/run.types";
import type { WorkflowUsage } from "@/types/usage.types";

/**
 * Workflow runs against Spring Boot.
 *
 * `enqueue` does not execute anything: it answers 202 with a PENDING run, and the
 * backend's scheduler picks it up on its next pass (every second by default). The
 * only way to learn what happened is to poll `get`.
 *
 * Its own service rather than more of `workflow.service.ts` because a run is its own
 * resource with its own lifecycle — even though the backend hangs its paths off
 * /api/workflows.
 */
export const runService = {
  enqueue(workflowId: number | string, token: string) {
    // No body: the backend's endpoint takes no request payload.
    return apiClient<RunSummary>(ENDPOINTS.WORKFLOWS.run(workflowId), {
      method: "POST",
      token,
    });
  },

  get(runId: number | string, token: string) {
    return apiClient<RunDetail>(ENDPOINTS.RUNS.byId(runId), { token });
  },

  /** Sends every message an OUTPUT node held for manual review. Answers the updated node. */
  sendPending(runId: number | string, nodeId: string, token: string) {
    return apiClient<NodeRun>(ENDPOINTS.RUNS.sendNode(runId, nodeId), {
      method: "POST",
      token,
    });
  },

  /** Lifetime run count against the caller's plan limit. */
  getUsage(token: string) {
    return apiClient<WorkflowUsage>(ENDPOINTS.RUNS.USAGE, { token });
  },
};
