import { getIncomers, getOutgoers, type Edge, type XYPosition } from "@xyflow/react";

import type { WorkflowNode } from "@/components/workflow/types";

export const WORKFLOW_EDGE_TYPE = "workflow";

/*
 * An attachment rather than a step: a chat model hanging off an AI card. Every
 * traversal below reads chain edges only, so a sub-edge can never be mistaken for
 * part of the flow — see `chainOnly`.
 */
export const SUB_EDGE_TYPE = "sub";

/*
 * The AI card's model socket. Named, so it reports separately from the card's unnamed
 * chain input.
 *
 * Here rather than beside the `<Handle/>` that renders it because the serializer needs
 * it too, and that module must not import a React component to read a constant — the
 * same rule `ai-fields` was split out for.
 */
export const AI_CHAT_MODEL_HANDLE = "chatModel";

export const NODE_GAP = 110;

const FALLBACK_SIZE = { width: 200, height: 120 };

export type NodeSize = { width: number; height: number };

/**
 * Where an incoming node lands, and what the rest of the chain does about it.
 * `rewire` is deferred because the edges can't be built until the node has an id.
 */
export type SpliceSite = {
  position: XYPosition;
  centreY: number;
  shifted: Map<string, XYPosition>;
  remove: readonly string[];
  rewire: (nodeId: string) => Edge[];
};

let edgeCount = 0;

export function nextEdgeId() {
  edgeCount += 1;
  return `edge-${edgeCount}`;
}

export function seedEdgeIds(ids: Iterable<string>) {
  for (const id of ids) {
    const match = /^edge-(\d+)$/.exec(id);
    if (match) edgeCount = Math.max(edgeCount, Number(match[1]));
  }
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function measure(node: WorkflowNode): NodeSize {
  return {
    width: node.measured?.width ?? asNumber(node.style?.width) ?? FALLBACK_SIZE.width,
    height: node.measured?.height ?? asNumber(node.style?.height) ?? FALLBACK_SIZE.height,
  };
}

function placeAfter(node: WorkflowNode, size: NodeSize) {
  const previous = measure(node);
  const centreY = node.position.y + previous.height / 2;

  return {
    centreY,
    position: {
      x: node.position.x + previous.width + NODE_GAP,
      y: centreY - size.height / 2,
    },
  };
}

function chainEdge(
  source: string,
  target: string,
  handles: { sourceHandle?: string | null; targetHandle?: string | null } = {},
): Edge {
  return {
    id: nextEdgeId(),
    type: WORKFLOW_EDGE_TYPE,
    source,
    target,
    sourceHandle: handles.sourceHandle ?? null,
    targetHandle: handles.targetHandle ?? null,
  };
}

/** A model → card link. Dashed and inert; `SubEdge` draws it. */
export function subEdge(source: string, target: string, targetHandle: string): Edge {
  return {
    id: nextEdgeId(),
    type: SUB_EDGE_TYPE,
    source,
    target,
    sourceHandle: null,
    targetHandle,
  };
}

/*
 * The chain, with attachments dropped.
 *
 * Every traversal here has to read through this. A sub-edge points from a model *into*
 * an AI card, so to `getIncomers` an attached card has two sources and to `getOutgoers`
 * a model is a step with a successor. Left in, a card with a model attached would stop
 * healing on delete — A → CARD → C would fail the "exactly one incomer" test and leave
 * A and C stranded — and inserting a node would try to shift the model as if it sat in
 * the flow.
 */
function chainOnly(edges: Edge[]) {
  return edges.filter((edge) => edge.type !== SUB_EDGE_TYPE);
}

/**
 * Every node reachable forward from `startId`, including it. `stopId` is never
 * collected — a cycle must not drag the node we are inserting after along with it.
 */
function reachableForward(startId: string, edges: Edge[], stopId: string) {
  const seen = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (id === stopId || seen.has(id)) continue;
    seen.add(id);
    for (const edge of edges) {
      if (edge.source === id) queue.push(edge.target);
    }
  }

  return seen;
}

export function planEdgeInsert(
  nodes: WorkflowNode[],
  edges: Edge[],
  edgeId: string,
  size: NodeSize,
): SpliceSite | null {
  const edge = edges.find((candidate) => candidate.id === edgeId);
  if (!edge) return null;

  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return null;

  const { centreY, position } = placeAfter(source, size);
  const shifted = new Map<string, XYPosition>();

  const overrun = position.x + size.width + NODE_GAP - target.position.x;
  if (overrun > 0) {
    for (const id of reachableForward(target.id, chainOnly(edges), source.id)) {
      const node = nodes.find((candidate) => candidate.id === id);
      if (node) shifted.set(id, { x: node.position.x + overrun, y: node.position.y });
    }

    /*
     * Attached models travel with the card they serve. They hang below the chain rather
     * than sitting in it, so nothing above reaches them — and a card that slid right
     * while its model stayed put would leave the dashed link skewed across the canvas.
     */
    for (const edge of edges) {
      if (edge.type !== SUB_EDGE_TYPE || !shifted.has(edge.target)) continue;
      const model = nodes.find((candidate) => candidate.id === edge.source);
      if (model && !shifted.has(model.id)) {
        shifted.set(model.id, { x: model.position.x + overrun, y: model.position.y });
      }
    }
  }

  return {
    position,
    centreY,
    shifted,
    remove: [edge.id],
    rewire: (nodeId) => [
      chainEdge(edge.source, nodeId, { sourceHandle: edge.sourceHandle }),
      chainEdge(nodeId, edge.target, { targetHandle: edge.targetHandle }),
    ],
  };
}

export function planAppend(
  nodes: WorkflowNode[],
  afterNodeId: string,
  handleId: string | null,
  size: NodeSize,
): SpliceSite | null {
  const source = nodes.find((node) => node.id === afterNodeId);
  if (!source) return null;

  return {
    ...placeAfter(source, size),
    shifted: new Map(),
    remove: [],
    rewire: (nodeId) => [chainEdge(afterNodeId, nodeId, { sourceHandle: handleId })],
  };
}

function firstSurvivor(
  node: WorkflowNode,
  nodes: WorkflowNode[],
  edges: Edge[],
  removed: Set<string>,
) {
  const walked = new Set([node.id]);
  let current = node;

  for (;;) {
    const outgoers = getOutgoers(current, nodes, edges);
    if (outgoers.length !== 1) return null;

    const [next] = outgoers;
    if (!removed.has(next.id)) return next;
    // Only reachable through a cycle made entirely of deleted nodes.
    if (walked.has(next.id)) return null;

    walked.add(next.id);
    current = next;
  }
}

export function healingEdges(
  nodes: WorkflowNode[],
  edges: Edge[],
  deleted: WorkflowNode[],
): Edge[] {
  const removed = new Set(deleted.map((node) => node.id));
  const healed: Edge[] = [];
  // Attachments are not links in the chain, so they never take part in healing.
  const chain = chainOnly(edges);

  for (const node of deleted) {
    const incomers = getIncomers(node, nodes, chain).filter((from) => !removed.has(from.id));
    if (incomers.length !== 1) continue;

    const [from] = incomers;
    const to = firstSurvivor(node, nodes, chain, removed);
    if (!to || to.id === from.id) continue;
    if (chain.some((edge) => edge.source === from.id && edge.target === to.id)) continue;

    healed.push(chainEdge(from.id, to.id));
  }

  return healed;
}
