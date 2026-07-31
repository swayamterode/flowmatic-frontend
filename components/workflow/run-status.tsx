"use client";

import { createContext, useContext } from "react";
import { Check, CircleSlash, Minus, TriangleAlert } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { isSettled, type NodeRun, type RunDetail } from "@/types/run.types";
import { cn } from "@/lib/utils";

/*
 * The last run's per-node result, readable from inside any node card.
 *
 * A context rather than callbacks threaded through node `data`, for the reason
 * `insert-target.tsx` already documents: otherwise the canvas's `renderedNodes`
 * switch grows a case for every node type that wants to show a badge, and this one
 * wants them all.
 */

type RunStatusValue = {
  detail: RunDetail | null;
  /** True while the run is still being polled, so an unlogged node is pending rather than skipped. */
  live: boolean;
};

const RunStatusContext = createContext<RunStatusValue>({ detail: null, live: false });

export const RunStatusProvider = RunStatusContext.Provider;

export type NodeRunState =
  /** The backend recorded this node. */
  | { kind: "logged"; run: NodeRun }
  /** The run is still going and hasn't got here yet. */
  | { kind: "waiting" }
  /** The run finished without ever running this node — it sits past a failure. */
  | { kind: "notReached" };

/** This node's place in the last run, or null when there is nothing to show. */
export function useNodeRun(nodeId: string): NodeRunState | null {
  const { detail, live } = useContext(RunStatusContext);
  if (!detail) return null;

  const run = detail.nodes.find((node) => node.nodeId === nodeId);
  if (run) return { kind: "logged", run };

  if (live && !isSettled(detail.status)) return { kind: "waiting" };
  return { kind: "notReached" };
}

/**
 * What a run state looks like, reduced to the four cases anything on the canvas
 * ever needs to draw. A card colours its border with this and an edge its stroke,
 * so the two can't disagree about what the same run said.
 */
export type RunTone = "neutral" | "running" | "success" | "failure";

export function toneOf(state: NodeRunState | null): RunTone {
  /*
   * Queued, skipped and not-reached all fall through to neutral deliberately. Their
   * badges already name them, and tinting them too would put four colours on the
   * canvas at once — which would bury the one node actually working, the thing the
   * pulse exists to make findable.
   */
  if (!state || state.kind !== "logged") return "neutral";

  switch (state.run.status) {
    case "RUNNING":
      return "running";
    case "SUCCESS":
      return "success";
    case "FAILED":
      return "failure";
    default:
      return "neutral";
  }
}

/** This node's tone. `neutral` before any run, so an untouched canvas is unchanged. */
export function useRunTone(nodeId: string): RunTone {
  return toneOf(useNodeRun(nodeId));
}

/**
 * Border classes for a node card, keyed by tone.
 *
 * Each non-neutral tone restates itself under `group-hover:`, because the cards
 * raise `group-hover:border-muted-foreground/35` and a variant selector outranks a
 * plain one no matter where `cn` puts it — without this, hovering a failed node
 * would quietly grey out the red.
 *
 * Borders only: the ring stays the selection's, so a node that is both selected and
 * failed reads as a red border inside a brand ring rather than one state hiding the
 * other. Failure carries the heavier border to make up for having no ring of its own.
 */
export const RUN_TONE_CARD: Record<RunTone, string> = {
  neutral: "",
  running: "run-pulse border-brand/70 group-hover:border-brand/80",
  success: "border-run-success/55 group-hover:border-run-success/75",
  failure: "border-destructive/75 group-hover:border-destructive/90",
};

/** Edge stroke per tone. `null` leaves whatever React Flow was already drawing. */
export const RUN_TONE_STROKE: Record<RunTone, string | null> = {
  neutral: null,
  running: "var(--brand)",
  success: "var(--run-success)",
  failure: "var(--destructive)",
};

const BADGE_BASE =
  "ml-auto flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium";

/**
 * A node card's run indicator. Renders nothing when no run has been started, so a
 * card looks exactly as it did before execution existed.
 */
export function NodeRunBadge({ nodeId }: { nodeId: string }) {
  const state = useNodeRun(nodeId);
  if (!state) return null;

  if (state.kind === "waiting") {
    return (
      <span className={cn(BADGE_BASE, "border-dashed text-muted-foreground")}>
        <Spinner className="size-2.5" />
        Queued
      </span>
    );
  }

  if (state.kind === "notReached") {
    return (
      <span className={cn(BADGE_BASE, "border-dashed text-muted-foreground")}>
        <Minus className="size-2.5" strokeWidth={2.5} />
        Not reached
      </span>
    );
  }

  switch (state.run.status) {
    case "RUNNING":
      return (
        <span className={cn(BADGE_BASE, "border-brand/40 text-brand")}>
          <Spinner className="size-2.5" />
          Running
        </span>
      );
    case "SUCCESS":
      return (
        <span className={cn(BADGE_BASE, "border-run-success/30 text-run-success")}>
          <Check className="size-2.5" strokeWidth={3} />
          Done
        </span>
      );
    case "FAILED":
      return (
        <span className={cn(BADGE_BASE, "border-destructive/40 text-destructive")}>
          <TriangleAlert className="size-2.5" strokeWidth={2.5} />
          Failed
        </span>
      );
    case "SKIPPED":
      return (
        <span className={cn(BADGE_BASE, "border-dashed text-muted-foreground")}>
          <CircleSlash className="size-2.5" strokeWidth={2.5} />
          Skipped
        </span>
      );
    case "PENDING":
      return (
        <span className={cn(BADGE_BASE, "border-dashed text-muted-foreground")}>
          <Spinner className="size-2.5" />
          Queued
        </span>
      );
  }
}
