"use client";

import Link from "next/link";
import { Check, Minus, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { orderedRailNodes } from "@/components/workflow/node-rail";
import type { WorkflowNode } from "@/components/workflow/types";
import { asInstant, type NodeRun, type NodeRunStatus, type RunDetail } from "@/types/run.types";
import { cn } from "@/lib/utils";

/*
 * The Run tab: an overview, not a duplicate of every node's own tab. Overall
 * status and timing up top, then a compact list that jumps to a step's own
 * tab for the detail — the output dump used to live here, but now it's where
 * the node's fields already are.
 */

const STATUS_STYLE: Record<RunDetail["status"], string> = {
  SUCCESS: "text-run-success",
  FAILED: "text-destructive",
  RUNNING: "text-brand",
  PENDING: "text-muted-foreground",
};

const STEP_STATUS_STYLE: Record<NodeRunStatus, string> = {
  SUCCESS: "text-run-success",
  FAILED: "text-destructive",
  RUNNING: "text-brand",
  PENDING: "text-muted-foreground",
  SKIPPED: "text-muted-foreground",
};

function StepIcon({ status }: { status: NodeRunStatus }) {
  switch (status) {
    case "SUCCESS":
      return <Check className="size-3 shrink-0" strokeWidth={3} />;
    case "FAILED":
      return <TriangleAlert className="size-3 shrink-0" strokeWidth={2.5} />;
    case "SKIPPED":
      return <Minus className="size-3 shrink-0" strokeWidth={2.5} />;
    case "RUNNING":
    case "PENDING":
      return <Spinner className="size-3 shrink-0" />;
  }
}

function stepDuration(run: NodeRun): string | null {
  const started = asInstant(run.startedAt);
  const completed = asInstant(run.completedAt);
  if (!started || !completed) return null;
  const ms = completed.getTime() - started.getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

type RunSummaryTabProps = {
  detail: RunDetail | null;
  error: string | null;
  blocked: boolean;
  busy: boolean;
  nodes: WorkflowNode[];
  onSelectNode: (nodeId: string) => void;
};

export function RunSummaryTab({
  detail,
  error,
  blocked,
  busy,
  nodes,
  onSelectNode,
}: RunSummaryTabProps) {
  const logged = new Map((detail?.nodes ?? []).map((run) => [run.nodeId, run]));
  const steps = orderedRailNodes(nodes);

  return (
    <div className="flex flex-col gap-3">
      {detail && (
        <p
          className={cn(
            "flex items-center gap-1.5 text-[13px] font-medium",
            STATUS_STYLE[detail.status],
          )}
        >
          {detail.status === "PENDING"
            ? "Queued"
            : detail.status === "RUNNING"
              ? "Running"
              : detail.status === "SUCCESS"
                ? "Finished"
                : "Failed"}
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 px-2.5 py-2 text-[12px] leading-snug text-destructive"
        >
          <p>{error}</p>
          {blocked && (
            <Button
              render={<Link href="/pricing" />}
              size="sm"
              variant="outline"
              className="w-fit border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              View plans
            </Button>
          )}
        </div>
      )}

      {!detail && !error && (
        <p className="px-1 text-[13px] leading-snug text-muted-foreground">
          {busy ? "Starting…" : "Nothing has run yet."}
        </p>
      )}

      {detail && (
        <ul className="flex flex-col gap-1">
          {steps.map((node) => {
            const run = logged.get(node.id);
            return (
              <li key={node.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[12px] hover:bg-muted/50"
                  onClick={() => onSelectNode(node.id)}
                >
                  {run ? (
                    <span className={cn("flex items-center", STEP_STATUS_STYLE[run.status])}>
                      <StepIcon status={run.status} />
                    </span>
                  ) : (
                    <Minus className="size-3 shrink-0 text-muted-foreground" strokeWidth={2.5} />
                  )}
                  <span className="truncate font-mono">{node.id}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {run ? (stepDuration(run) ?? "") : busy ? "waiting" : "not reached"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
