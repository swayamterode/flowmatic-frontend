"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";

import {
  AI_CHAT_MODEL_HANDLE,
  healingEdges,
  nextEdgeId,
  planAppend,
  planEdgeInsert,
  subEdge,
  WORKFLOW_EDGE_TYPE,
  type SpliceSite,
} from "@/components/workflow/graph-ops";
import type { NodeCatalogItem } from "@/components/workflow/node-catalog";
import { NODE_Z_INDEX } from "@/components/workflow/node-defaults";
import { MANUAL_TRIGGER_LABEL } from "@/components/workflow/nodes/manual-trigger-node";
import type { WorkflowNode } from "@/components/workflow/types";

const INITIAL_NODES: WorkflowNode[] = [
  {
    id: "manual-trigger",
    type: "manualTrigger",
    position: { x: 0, y: 0 },
    zIndex: NODE_Z_INDEX,
    // A workflow without its trigger is not a workflow.
    deletable: false,
    data: { label: MANUAL_TRIGGER_LABEL },
  },
];

/** Canvas contents a saved workflow was loaded into, in place of the blank start. */
export type InitialGraph = { nodes: WorkflowNode[]; edges: Edge[] };

/*
 * Owns the canvas contents. Both the bottom toolbar and the nodes panel add
 * nodes, so placement lives here rather than in either caller — a clicked item
 * and a dropped item land through the same code path and can't drift apart.
 *
 * `paneRef` is the element wrapping React Flow. `getRightInset` reports how many
 * pixels of its right edge are currently covered by the nodes panel overlay, so
 * "center of the canvas" means the center of what the user can actually see —
 * a node added with the panel open doesn't land underneath it.
 *
 * `initial` is a saved workflow's contents. It is read once, when the state is
 * created: after that the canvas is the source of truth, and a later change to
 * the prop would fight whatever the user has done since.
 */
export function useWorkflowNodes(
  paneRef: RefObject<HTMLDivElement | null>,
  getRightInset: () => number,
  initial?: InitialGraph | null,
) {
  /*
   * `getNodes`/`getEdges` read React Flow's own store rather than the state below.
   * Two reasons: they can't go stale inside a callback, and the store is the only
   * place node dimensions exist — chain placement needs measured widths, which our
   * state never sees.
   */
  const { getEdges, getNodes, screenToFlowPosition } = useReactFlow<WorkflowNode>();

  const [nodes, setNodes] = useState<WorkflowNode[]>(() => initial?.nodes ?? INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(() => initial?.edges ?? []);

  /*
   * Nodes waiting to be seated on their chain's centre line, mapped to that line.
   * A node is placed from its *declared* height, which is only ever a guess, so it
   * lands a few pixels off and the connection into it steps instead of running
   * straight. Entries are consumed the first time React Flow reports a real height.
   */
  const pendingCentreY = useRef(new Map<string, number>());

  const onNodesChange = useCallback((changes: NodeChange<WorkflowNode>[]) => {
    /*
     * Resolved out here rather than inside the updater: the updater has to stay pure,
     * and this both reads and drains a ref.
     */
    const seated = new Map<string, number>();
    for (const change of changes) {
      if (change.type !== "dimensions" || !change.dimensions) continue;
      const centreY = pendingCentreY.current.get(change.id);
      if (centreY === undefined) continue;
      pendingCentreY.current.delete(change.id);
      seated.set(change.id, centreY - change.dimensions.height / 2);
    }

    setNodes((snapshot) => {
      const next = applyNodeChanges(changes, snapshot);
      if (seated.size === 0) return next;
      return next.map((node) => {
        const y = seated.get(node.id);
        return y === undefined ? node : { ...node, position: { ...node.position, y } };
      });
    });
  }, []);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((snapshot) => applyEdgeChanges(changes, snapshot)),
    [],
  );

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((snapshot) =>
        addEdge(
          /*
           * Which handle it lands on decides what kind of edge this is. Dragging into
           * an AI card's model slot by hand has to produce the same dashed attachment
           * the slot's own `+` does, or the link would render as a chain step and be
           * serialized as one.
           */
          connection.targetHandle === AI_CHAT_MODEL_HANDLE
            ? subEdge(connection.source, connection.target, AI_CHAT_MODEL_HANDLE)
            : // An explicit id and type, so a hand-drawn edge is indistinguishable from
              // a spliced one — React Flow's generated id isn't unique across a delete.
              { ...connection, id: nextEdgeId(), type: WORKFLOW_EDGE_TYPE },
          snapshot,
        ),
      ),
    [],
  );

  /*
   * A model attaches to a card's slot, and only there — and only a model may.
   *
   * Both halves matter. A chain edge drawn out of a model would be dropped on save
   * (the serializer writes an edge only when both ends are real backend nodes), so it
   * would look connected until the page was reloaded. And a chain node wired into the
   * slot would render as an attachment while feeding nothing.
   */
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const fromModel =
        getNodes().find((node) => node.id === connection.source)?.type === "chatModel";
      return fromModel === (connection.targetHandle === AI_CHAT_MODEL_HANDLE);
    },
    [getNodes],
  );

  /*
   * Reconnects what a deletion would otherwise strand: A → B → C becomes A → C.
   * It belongs here rather than in the node toolbars because keyboard and marquee
   * deletion never touch those — every path ends up in this one handler.
   *
   * Healing is computed eagerly, and against the store rather than the state below.
   * React Flow removes the connected edges just before it calls this, so a snapshot
   * read inside the updater would already have nothing left to heal from; the store
   * still holds the pre-delete graph because that removal is only a queued setState.
   * The new edges then append to the cleaned list, and their fresh ids can't collide
   * with the ones on their way out.
   */
  const onNodesDelete = useCallback(
    (deleted: WorkflowNode[]) => {
      const healed = healingEdges(getNodes(), getEdges(), deleted);
      if (healed.length === 0) return;
      setEdges((snapshot) => [...snapshot, ...healed]);
    },
    [getEdges, getNodes],
  );

  // Nodes are centered on the given screen point, not hanging off it.
  const addItemAtScreenPoint = useCallback(
    (item: NodeCatalogItem, x: number, y: number) => {
      const { x: flowX, y: flowY } = screenToFlowPosition({ x, y });
      const node = item.create({
        x: flowX - item.size.width / 2,
        y: flowY - item.size.height / 2,
      });
      setNodes((snapshot) => [...snapshot, node]);
      return node;
    },
    [screenToFlowPosition],
  );

  const addItemAtPaneCenter = useCallback(
    (item: NodeCatalogItem) => {
      const rect = paneRef.current?.getBoundingClientRect();
      if (!rect) return;
      const visibleWidth = Math.max(rect.width - getRightInset(), 0);
      return addItemAtScreenPoint(item, rect.left + visibleWidth / 2, rect.top + rect.height / 2);
    },
    [addItemAtScreenPoint, getRightInset, paneRef],
  );

  /*
   * Both chain insertions land here: `graph-ops` decides where the node goes and who
   * moves aside, and this applies that plan. Kept as one function so a splice into an
   * edge and an append onto a free output can't drift apart.
   */
  const applySite = useCallback((item: NodeCatalogItem, site: SpliceSite) => {
    const node = item.create(site.position);
    // Corrected onto the exact centre line as soon as the node has been measured.
    pendingCentreY.current.set(node.id, site.centreY);

    setNodes((snapshot) => [
      ...snapshot.map((existing) => {
        const shifted = site.shifted.get(existing.id);
        return shifted ? { ...existing, position: shifted } : existing;
      }),
      node,
    ]);

    const rewired = site.rewire(node.id);
    setEdges((snapshot) => [
      ...snapshot.filter((edge) => !site.remove.includes(edge.id)),
      ...rewired,
    ]);

    return node;
  }, []);

  /** Splices a node into an existing connection. False if that edge is already gone. */
  const insertItemOnEdge = useCallback(
    (item: NodeCatalogItem, edgeId: string) => {
      const site = planEdgeInsert(getNodes(), getEdges(), edgeId, item.size);
      if (!site) return false;
      applySite(item, site);
      return true;
    },
    [applySite, getEdges, getNodes],
  );

  /** Extends the chain past a node's free output. False if that node is already gone. */
  const appendItemAfterNode = useCallback(
    (item: NodeCatalogItem, nodeId: string, handleId: string | null) => {
      const site = planAppend(getNodes(), nodeId, handleId, item.size);
      if (!site) return false;
      applySite(item, site);
      return true;
    },
    [applySite, getNodes],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    onNodesDelete,
    addItemAtScreenPoint,
    addItemAtPaneCenter,
    insertItemOnEdge,
    appendItemAfterNode,
  };
}
