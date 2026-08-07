"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RouteError, getRoute, postRoute } from "@/lib/api/route-client";
import { useWorkflowUsage } from "@/components/workflow-usage-provider";
import { isSettled, type NodeRun, type RunDetail, type RunSummary } from "@/types/run.types";

/*
 * Running the canvas, and following what happens.
 *
 * Enqueue-and-poll rather than request-and-wait, because that is what the backend
 * offers: POST answers 202 with a PENDING run and its scheduler drains the queue on
 * a timer. There is no response to wait on.
 */

/** Matches the backend's own drain interval (`app.workflow.poll-interval-ms`). */
const POLL_INTERVAL_MS = 1000;

/**
 * How long to keep polling a run that never settles. Long enough for a slow model
 * call and a batch of emails, short enough that a wedged backend doesn't leave a tab
 * polling forever.
 */
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

export type RunPhase = "idle" | "starting" | "polling" | "done" | "error";

type WorkflowRunOptions = {
  /** Saves the canvas and resolves with its workflow id, or null if the save failed. */
  save: () => Promise<number | null>;
};

export function useWorkflowRun({ save }: WorkflowRunOptions) {
  const { refresh: refreshUsage } = useWorkflowUsage();
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
   * Bumped by every start and by unmount. A poll loop compares the ticket it was
   * born with against this and stops when they differ, so a second run can't be
   * overwritten by the first one's in-flight response.
   */
  const ticket = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      ticket.current += 1;
      inFlight.current?.abort();
    },
    [],
  );

  const start = useCallback(async () => {
    ticket.current += 1;
    const mine = ticket.current;
    inFlight.current?.abort();

    setPhase("starting");
    setError(null);
    // Cleared so the previous run's badges don't sit on the cards looking current.
    setDetail(null);

    /*
     * Saving first is not a convenience. A workflow that has never been saved has no
     * id to run, and a dirty one would run the graph the backend still holds rather
     * than the one on screen.
     */
    let workflowId: number | null;
    try {
      workflowId = await save();
    } catch {
      workflowId = null;
    }

    if (mine !== ticket.current) return;
    if (workflowId === null) {
      setPhase("error");
      setError("The workflow could not be saved, so it wasn’t run.");
      return;
    }

    let runId: number;
    try {
      const queued = await postRoute<RunSummary>(`/api/workflows/${workflowId}/run`);
      runId = queued.runId;
      if (mine !== ticket.current) return;
      setDetail({ ...queued, nodes: [] });
      setPhase("polling");
      refreshUsage();
    } catch (cause) {
      if (mine !== ticket.current) return;
      setPhase("error");
      setError(cause instanceof RouteError ? cause.message : "Could not start that workflow.");
      return;
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (mine === ticket.current) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      if (mine !== ticket.current) return;

      const controller = new AbortController();
      inFlight.current = controller;

      try {
        const next = await getRoute<RunDetail>(`/api/workflows/runs/${runId}`, controller.signal);
        if (mine !== ticket.current) return;

        setDetail(next);
        if (isSettled(next.status)) {
          setPhase("done");
          return;
        }
      } catch (cause) {
        if (mine !== ticket.current || controller.signal.aborted) return;
        setPhase("error");
        setError(cause instanceof RouteError ? cause.message : "Lost track of that run.");
        return;
      }

      if (Date.now() > deadline) {
        setPhase("error");
        setError("This run is taking longer than expected. It may still finish on the server.");
        return;
      }
    }
  }, [save, refreshUsage]);

  const clear = useCallback(() => {
    ticket.current += 1;
    inFlight.current?.abort();
    setPhase("idle");
    setDetail(null);
    setError(null);
  }, []);

  /**
   * Patches one node's row in place, e.g. after the manual-review "Send" action
   * settles its messages — no need to wait for the next poll (there may not be one,
   * since the run itself already finished before anyone reviewed anything).
   */
  const applyNodeUpdate = useCallback((updated: NodeRun) => {
    setDetail((current) =>
      current
        ? {
            ...current,
            nodes: current.nodes.map((node) => (node.nodeId === updated.nodeId ? updated : node)),
          }
        : current,
    );
  }, []);

  return {
    start,
    clear,
    applyNodeUpdate,
    phase,
    detail,
    error,
    /** True while a run is being started or followed — the Execute button's state. */
    busy: phase === "starting" || phase === "polling",
  };
}
