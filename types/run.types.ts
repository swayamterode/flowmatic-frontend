import type { BackendNodeType } from "@/types/workflow.types";

/**
 * Workflow run shapes, as WorkflowRunController actually serializes them.
 *
 * A run is queued, not executed, by the request that creates it: the backend's
 * scheduler drains the queue one run at a time (every second by default), so a
 * caller enqueues and then polls.
 */

export type RunStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

/** A node can additionally be skipped, on a CONDITION branch that wasn't taken. */
export type NodeRunStatus = RunStatus | "SKIPPED";

/** True once the backend will make no further changes to this run. */
export function isSettled(status: RunStatus): boolean {
  return status === "SUCCESS" || status === "FAILED";
}

/**
 * Timestamps arrive as strings, and an unset one is the four characters `"null"`.
 *
 * Not a mistake to work around silently — the controller builds these with
 * `String.valueOf(run.getCompletedAt())`, so a run that hasn't finished serializes
 * `"completedAt": "null"` rather than JSON null. Every read of these fields has to
 * go through here or a run in progress renders "Invalid Date".
 */
export function asInstant(value: string | null | undefined): Date | null {
  if (!value || value === "null") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Returned by POST /{id}/run (202) and listed by GET /{id}/runs. */
export interface RunSummary {
  runId: number;
  status: RunStatus;
  startedAt: string;
  completedAt: string;
}

export interface NodeRun {
  nodeId: string;
  nodeType: BackendNodeType;
  status: NodeRunStatus;
  /**
   * The node's output map, or a raw string when the stored JSON couldn't be parsed
   * back. Null until the node succeeds.
   */
  output: Record<string, unknown> | string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string;
}

/**
 * Returned by GET /workflows/runs/{runId}.
 *
 * `nodes` holds one entry per node that was *reached*, oldest first. A node missing
 * from it was never run — execution stops at the first failure, so everything
 * downstream of a failed node is absent rather than marked.
 */
export interface RunDetail extends RunSummary {
  nodes: NodeRun[];
}
