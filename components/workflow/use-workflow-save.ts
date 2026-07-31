"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edge } from "@xyflow/react";

import { RouteError, postRoute, putRoute } from "@/lib/api/route-client";
import type { WorkflowNode } from "@/components/workflow/types";
import {
  canonicalGraphJson,
  toGraph,
  type GraphPassthrough,
} from "@/components/workflow/workflow-graph";
import type { WorkflowSummary } from "@/types/workflow.types";

/*
 * Saving the canvas. Owns the workflow's identity and name, decides when a write
 * is due, and is the only place that talks to /api/workflows.
 *
 * The first save is explicit: a workflow needs a name and an id before it can be
 * updated, and creating one eagerly on page load would litter the account with
 * empty rows every time somebody opened the editor and left. Once it exists,
 * writes are automatic.
 */

export const DEFAULT_WORKFLOW_NAME = "Untitled workflow";

/** Long enough that a drag or a sentence is one save, short enough to feel safe. */
const AUTOSAVE_DELAY_MS = 1500;

export type SaveStatus = "unsaved" | "dirty" | "saving" | "saved" | "error";

type WorkflowSaveOptions = {
  /** Absent for a workflow that has never been saved. */
  workflowId?: number | null;
  initialName?: string;
  nodes: WorkflowNode[];
  edges: Edge[];
  /** Parts of the stored graph the canvas can't render; saved back untouched. */
  passthrough?: GraphPassthrough;
};

export function useWorkflowSave({
  workflowId: initialId = null,
  initialName,
  nodes,
  edges,
  passthrough,
}: WorkflowSaveOptions) {
  const [workflowId, setWorkflowId] = useState<number | null>(initialId ?? null);
  const [name, setName] = useState(initialName?.trim() || DEFAULT_WORKFLOW_NAME);
  const [phase, setPhase] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const graphJson = useMemo(
    () => canonicalGraphJson(nodes, edges, passthrough),
    [nodes, edges, passthrough],
  );

  /*
   * What the backend last accepted, plus the graph a failed save was carrying so
   * a failure doesn't retry itself forever.
   *
   * State rather than a ref because `dirty` is derived from it during render. The
   * initializer's values are the baseline we want: a freshly loaded workflow is
   * not dirty, and neither is an untouched new canvas — so nothing is written
   * until the user actually changes something.
   */
  const [accepted, setAccepted] = useState({ graphJson, name });
  const [failedGraphJson, setFailedGraphJson] = useState<string | null>(null);

  /*
   * A save reads the canvas at the moment it runs, not at the moment it was
   * scheduled: a queued save fires after the one before it, by which time the
   * canvas has usually moved on. Written from an effect so nothing touches a ref
   * mid-render.
   */
  const latest = useRef({ name, graphJson, nodes, edges, passthrough, workflowId });
  useEffect(() => {
    latest.current = { name, graphJson, nodes, edges, passthrough, workflowId };
  });

  const inFlight = useRef(false);
  const queued = useRef(false);

  const dirty = graphJson !== accepted.graphJson || name !== accepted.name;

  /**
   * Writes the canvas, and resolves with the workflow's id — or null if it could not
   * be saved.
   *
   * The id is returned because running a workflow has to save it first: a new
   * workflow has no id to run, and a dirty one would execute a graph other than the
   * one on screen. A caller can't read `workflowId` from this hook straight after
   * awaiting, since its own closure still holds the old value.
   */
  const save = useCallback(async (): Promise<number | null> => {
    /*
     * One write at a time. Overlapping PUTs can land out of order, and the backend
     * has no version to arbitrate with — last response wins. The queued write is
     * somebody else's, so the id this call knows about is the honest answer.
     */
    if (inFlight.current) {
      queued.current = true;
      return latest.current.workflowId;
    }

    inFlight.current = true;
    setPhase("saving");
    setError(null);

    // Null until a write lands, so a failure is reported as one rather than as a
    // save that quietly did nothing.
    let savedId: number | null = null;

    try {
      /*
       * Loops rather than recurses, so an edit made mid-save is written straight
       * afterwards without stacking calls. A failure breaks out: retrying on a
       * timer is autosave's job, and only once something has changed.
       */
      do {
        queued.current = false;
        const attempt = latest.current;

        try {
          const graph = toGraph(attempt.nodes, attempt.edges, attempt.passthrough);

          if (attempt.workflowId === null) {
            const created = await postRoute<WorkflowSummary>("/api/workflows", {
              name: attempt.name,
              graph,
            });
            setWorkflowId(created.id);
            /*
             * The URL gains the id without a navigation. `router.replace` would
             * unmount this editor and refetch a graph we are already holding, and
             * an edit made during the save would go down with it.
             */
            window.history.replaceState(null, "", `/workflows/${created.id}`);
            latest.current = { ...attempt, workflowId: created.id };
          } else {
            await putRoute(`/api/workflows/${attempt.workflowId}`, {
              name: attempt.name,
              graph,
            });
          }

          setAccepted({ graphJson: attempt.graphJson, name: attempt.name });
          setFailedGraphJson(null);
          setLastSavedAt(new Date());
          // Read from `latest`, not `attempt`: a create above rewrote it with the
          // id the backend just handed back.
          savedId = latest.current.workflowId;
        } catch (cause) {
          setFailedGraphJson(attempt.graphJson);
          setError(cause instanceof RouteError ? cause.message : "Could not reach the server.");
          savedId = null;
          break;
        }
      } while (queued.current);
    } finally {
      inFlight.current = false;
      queued.current = false;
      setPhase("idle");
    }

    return savedId;
  }, []);

  /*
   * Autosave, once the workflow exists. A failed attempt is not retried until the
   * canvas changes again — otherwise a backend that is down turns into a request
   * loop — but pressing Save always tries.
   */
  useEffect(() => {
    if (workflowId === null || !dirty) return;
    if (phase === "saving" || failedGraphJson === graphJson) return;

    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [workflowId, dirty, phase, graphJson, failedGraphJson, name, save]);

  // ⌘S / Ctrl+S. The canvas's own shortcuts bail out on a modifier, so nothing collides.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      void save();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  // Last line of defence for a workflow that hasn't been saved yet, or a save
  // still in the air.
  useEffect(() => {
    if (!dirty && phase !== "saving") return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, phase]);

  const status: SaveStatus =
    phase === "saving"
      ? "saving"
      : error
        ? "error"
        : dirty
          ? "dirty"
          : workflowId === null
            ? "unsaved"
            : "saved";

  /*
   * The committed name, never blank — the backend rejects a blank one, and a name
   * that normalized itself on every keystroke could not be retyped. Callers keep
   * their own draft and commit it, as the sticky note does with its content.
   */
  const rename = useCallback((next: string) => {
    setName(next.trim() || DEFAULT_WORKFLOW_NAME);
  }, []);

  return { workflowId, name, rename, status, error, lastSavedAt, dirty, save };
}
