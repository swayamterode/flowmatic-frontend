import type { Edge } from "@xyflow/react";

import { asAiOutput } from "@/components/workflow/ai-fields";
import { asEmailData, toEmailConfig } from "@/components/workflow/email-fields";
import {
  AI_CHAT_MODEL_HANDLE,
  nextEdgeId,
  seedEdgeIds,
  subEdge,
  SUB_EDGE_TYPE,
  WORKFLOW_EDGE_TYPE,
} from "@/components/workflow/graph-ops";
import { NODE_Z_INDEX, NOTE_Z_INDEX, seedNodeIds } from "@/components/workflow/node-defaults";
import { AI_WIDTH } from "@/components/workflow/nodes/ai-node";
import type { ChatModelProvider } from "@/components/workflow/nodes/chat-model-node";
import { EMAIL_WIDTH } from "@/components/workflow/nodes/email-node";
import { DATASOURCE_WIDTH, type DatasourceFile } from "@/components/workflow/nodes/datasource-node";
import { MANUAL_TRIGGER_LABEL } from "@/components/workflow/nodes/manual-trigger-node";
import { STICKY_NOTE_DEFAULT_SIZE } from "@/components/workflow/nodes/sticky-note-node";
import {
  DEFAULT_NOTE_COLOR,
  NOTE_COLORS,
  type NoteColor,
} from "@/components/workflow/sticky-note-colors";
import type { WorkflowNode } from "@/components/workflow/types";
import type {
  BackendNodeType,
  GraphChatModel,
  GraphEdge,
  GraphNode,
  GraphNote,
  GraphPosition,
  GraphSize,
  WorkflowGraph,
} from "@/types/workflow.types";

/*
 * Translation between what the canvas holds and what the backend stores.
 *
 * Spring keeps `graph` as an opaque JSON map — written verbatim, read back
 * unchanged, and every record it later deserializes ignores unknown fields — so
 * this module owns the wire shape end to end. Pure functions, no React, so the
 * contract can be read in one sitting.
 *
 * Three rules shape everything below:
 *
 * 1. `type` is the backend's NodeType enum, because that is what the executor
 *    dispatches on. The canvas type rides alongside as `uiType`.
 * 2. Sticky notes and chat models are NOT nodes. `GraphNode.type` deserializes to that
 *    enum, so either one in `nodes` fails the whole graph parse at run time. They live
 *    under `notes` and `chatModels`, which the executor never looks at. Their edges are
 *    excluded too: a link into a node the backend has no record of would either break
 *    its DAG or invent a dependency.
 * 3. Only whitelisted fields are written. React Flow rewrites `selected`,
 *    `dragging` and `measured` constantly; persisting them would make the
 *    save diff churn on every click, and it would drag injected callbacks
 *    (`data.onAction`) into the payload.
 */

type CanvasNodeType = NonNullable<WorkflowNode["type"]>;

const BACKEND_TYPE_BY_UI: Record<CanvasNodeType, BackendNodeType | null> = {
  manualTrigger: "TRIGGER",
  datasource: "DATA_SOURCE",
  ai: "AI",
  email: "OUTPUT",
  // Canvas-only: an annotation, not a step. Serialized under `notes`.
  stickyNote: null,
  // Canvas-only: describes how a step runs, not a step. Serialized under `chatModels`.
  chatModel: null,
};

/*
 * Only consulted for graphs written without a `uiType` — the docs examples, or
 * anything built through Postman. One entry per backend type the canvas can
 * actually render.
 */
const UI_TYPE_BY_BACKEND: Partial<Record<BackendNodeType, CanvasNodeType>> = {
  TRIGGER: "manualTrigger",
  DATA_SOURCE: "datasource",
  AI: "ai",
  OUTPUT: "email",
};

/**
 * Parts of a stored graph this canvas can't render — nodes whose type has no
 * component yet (`OUTPUT`, `FILTER`, …) and the edges between them.
 *
 * They are carried through a load/save cycle untouched. Dropping them would be
 * silent data loss: open a workflow built through the API, let autosave fire, and
 * its OUTPUT node would be gone.
 */
export type GraphPassthrough = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export const EMPTY_PASSTHROUGH: GraphPassthrough = { nodes: [], edges: [] };

/* ------------------------------------------------------------------ reading */

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asPosition(value: unknown): GraphPosition {
  const source = value as Partial<GraphPosition> | undefined;
  return { x: asNumber(source?.x) ?? 0, y: asNumber(source?.y) ?? 0 };
}

/** Width/height only. Everything else React Flow's `style` can hold is chrome. */
function asSize(value: unknown): GraphSize | undefined {
  const source = value as Partial<GraphSize> | undefined;
  const width = asNumber(source?.width);
  const height = asNumber(source?.height);
  if (width === undefined && height === undefined) return undefined;
  return {
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  };
}

/**
 * A datasource's file descriptor, or undefined when the stored data can't be
 * trusted. `uploadId` is required: the card exists to say "these rows will come
 * from this file", and without the id it would be describing nothing. An
 * unreadable descriptor renders as an empty node the user can drop a CSV on
 * again, which beats crashing the canvas over a hand-edited row.
 */
function asDatasourceFile(data: Record<string, unknown>): DatasourceFile | undefined {
  const uploadId = data.uploadId;
  const file = data.file as Partial<DatasourceFile> | undefined;
  if (typeof uploadId !== "string" || !uploadId || !file) return undefined;

  const size = asNumber(file.size);
  const rowCount = asNumber(file.rowCount);
  if (typeof file.name !== "string" || size === undefined || rowCount === undefined) {
    return undefined;
  }
  if (!Array.isArray(file.columns) || file.columns.some((c) => typeof c !== "string")) {
    return undefined;
  }

  return { uploadId, name: file.name, size, rowCount, columns: file.columns };
}

function asNoteColor(value: unknown): NoteColor {
  return NOTE_COLORS.some((color) => color.key === value)
    ? (value as NoteColor)
    : DEFAULT_NOTE_COLOR;
}

/** Rebuilds one canvas node, or null when its type has no component here. */
function toCanvasNode(node: GraphNode): WorkflowNode | null {
  const uiType = (node.uiType ?? UI_TYPE_BY_BACKEND[node.type]) as CanvasNodeType | undefined;
  if (!uiType || !(uiType in BACKEND_TYPE_BY_UI)) return null;

  const shared = {
    id: node.id,
    position: asPosition(node.position),
    zIndex: asNumber(node.zIndex) ?? NODE_Z_INDEX,
    ...(node.deletable === false ? { deletable: false } : {}),
  };

  switch (uiType) {
    case "manualTrigger":
      return {
        ...shared,
        type: "manualTrigger",
        data: {
          label: typeof node.data.label === "string" ? node.data.label : MANUAL_TRIGGER_LABEL,
        },
      };

    case "datasource":
      return {
        ...shared,
        type: "datasource",
        // Width only, as when the node is created — a filled card is shorter than
        // an empty one, so its height is never pinned.
        style: { width: asSize(node.style)?.width ?? DATASOURCE_WIDTH },
        data: { file: asDatasourceFile(node.data) },
      };

    case "ai":
      return {
        ...shared,
        type: "ai",
        style: { width: asSize(node.style)?.width ?? AI_WIDTH },
        /*
         * An unreadable prompt becomes an empty one rather than a reason to fail:
         * the card then reads "No prompt yet" and can be filled in, which beats
         * dropping the node over a hand-edited field.
         */
        data: {
          prompt: typeof node.data.prompt === "string" ? node.data.prompt : "",
          output: asAiOutput(node.data.output),
        },
      };

    case "email":
      return {
        ...shared,
        type: "email",
        style: { width: asSize(node.style)?.width ?? EMAIL_WIDTH },
        data: asEmailData(node.data),
      };

    // Neither of these ever arrives as a GraphNode; each has its own key.
    case "stickyNote":
    case "chatModel":
      return null;
  }
}

function toCanvasNote(note: GraphNote): WorkflowNode | null {
  if (!note?.id) return null;

  return {
    id: note.id,
    type: "stickyNote",
    position: asPosition(note.position),
    style: { ...STICKY_NOTE_DEFAULT_SIZE, ...asSize(note.style) },
    zIndex: asNumber(note.zIndex) ?? NOTE_Z_INDEX,
    data: {
      content: typeof note.data?.content === "string" ? note.data.content : "",
      color: asNoteColor(note.data?.color),
    },
  };
}

/*
 * `provider` is narrowed rather than trusted: it is the only field a hand-edited graph
 * could put something unusable in, and the union is one member wide today. Anything
 * else becomes Groq, which is what the backend would have run regardless.
 */
function asChatModelProvider(value: unknown): ChatModelProvider {
  return value === "groq" ? value : "groq";
}

function toCanvasChatModel(model: GraphChatModel): WorkflowNode | null {
  if (!model?.id) return null;

  return {
    id: model.id,
    type: "chatModel",
    position: asPosition(model.position),
    zIndex: asNumber(model.zIndex) ?? NODE_Z_INDEX,
    data: { provider: asChatModelProvider(model.data?.provider) },
  };
}

function toCanvasEdge(edge: GraphEdge): Edge {
  return {
    // Graphs written outside the app carry neither, so both have a fallback.
    id: edge.id ?? nextEdgeId(),
    type: edge.type ?? WORKFLOW_EDGE_TYPE,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
  };
}

/**
 * Turns a stored graph into canvas state.
 *
 * Reserves every id it hands back (`seedNodeIds`/`seedEdgeIds`) as part of
 * loading. The id counters are module-level and reset on each page load, so
 * without this the next node added to a loaded workflow would reuse an id that is
 * already on the canvas — and node ids are the roots of the backend's
 * `{{nodeId.field}}` templates, so a collision makes a reference ambiguous.
 */
export function fromGraph(graph: WorkflowGraph): {
  nodes: WorkflowNode[];
  edges: Edge[];
  passthrough: GraphPassthrough;
} {
  const storedNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const storedEdges = Array.isArray(graph?.edges) ? graph.edges : [];
  const storedNotes = Array.isArray(graph?.notes) ? graph.notes : [];
  const storedModels = Array.isArray(graph?.chatModels) ? graph.chatModels : [];

  const nodes: WorkflowNode[] = [];
  const passthrough: GraphPassthrough = { nodes: [], edges: [] };

  for (const stored of storedNodes) {
    if (!stored?.id) continue;
    const node = toCanvasNode(stored);
    if (node) nodes.push(node);
    else passthrough.nodes.push(stored);
  }

  for (const note of storedNotes) {
    const node = toCanvasNote(note);
    if (node) nodes.push(node);
  }

  for (const model of storedModels) {
    const node = toCanvasChatModel(model);
    if (node) nodes.push(node);
  }

  const rendered = new Set(nodes.map((node) => node.id));
  const carried = new Set(passthrough.nodes.map((node) => node.id));
  const edges: Edge[] = [];

  for (const stored of storedEdges) {
    if (!stored?.source || !stored?.target) continue;
    const ends = [stored.source, stored.target];
    // An edge into a node this canvas can't draw travels with that node rather
    // than being handed to React Flow, which has nothing to attach it to.
    if (ends.every((id) => rendered.has(id))) edges.push(toCanvasEdge(stored));
    else if (ends.every((id) => rendered.has(id) || carried.has(id)))
      passthrough.edges.push(stored);
  }

  seedNodeIds([...rendered, ...carried]);
  /*
   * Seeded before any attachment is rebuilt below, because `subEdge` mints its id from
   * this same counter — synthesize first and a fresh sub-edge could be handed `edge-1`
   * while a stored chain edge is already using it.
   */
  seedEdgeIds(edges.map((edge) => edge.id));

  /*
   * Attachments are rebuilt from each model's `attachedTo`, since they were dropped
   * from `edges` on the way out. A model whose card is gone stays on the canvas
   * unattached, and that card's slot offers its `+` again.
   */
  for (const model of storedModels) {
    if (!model.attachedTo || !rendered.has(model.id)) continue;
    if (!rendered.has(model.attachedTo)) continue;
    edges.push(subEdge(model.id, model.attachedTo, AI_CHAT_MODEL_HANDLE));
  }

  return { nodes, edges, passthrough };
}

/* ------------------------------------------------------------------ writing */

/** The config the backend reads for this node, and nothing the UI doesn't need back. */
function toBackendData(node: WorkflowNode): Record<string, unknown> {
  switch (node.type) {
    case "manualTrigger":
      // TRIGGER takes an optional `payload`; `label` is ours and is ignored.
      return { label: node.data.label };

    case "ai":
      /*
       * Both keys always, even when empty. `prompt` and `output` are the whole of
       * what AiNodeExecutor reads, and an absent `output` is a different thing to
       * the backend than a declared-empty one.
       */
      return { prompt: node.data.prompt, output: node.data.output };

    /*
     * Blank fields are dropped rather than sent empty — see `toEmailConfig`. An
     * empty `forEach` in particular would fail the executor's list check instead of
     * meaning "send one email".
     */
    case "email":
      return toEmailConfig(node.data);

    case "datasource": {
      const { file } = node.data;
      if (!file) return {};
      /*
       * `uploadId` sits at the top of `data` because that is exactly where
       * DataSourceNodeExecutor reads it. The rest describes the file for the card
       * — there is no endpoint to ask the backend what an uploadId contains, so
       * if this isn't stored the node comes back blank after a refresh.
       */
      return {
        uploadId: file.uploadId,
        file: {
          name: file.name,
          size: file.size,
          columns: file.columns,
          rowCount: file.rowCount,
        },
      };
    }

    default:
      return {};
  }
}

function toGraphChatModel(node: WorkflowNode, attachedTo: string | null): GraphChatModel | null {
  if (node.type !== "chatModel") return null;
  const size = asSize(node.style);

  return {
    id: node.id,
    attachedTo,
    data: { provider: node.data.provider },
    position: node.position,
    ...(size ? { style: size } : {}),
    ...(node.zIndex === undefined ? {} : { zIndex: node.zIndex }),
  };
}

function toGraphNote(node: WorkflowNode): GraphNote | null {
  if (node.type !== "stickyNote") return null;
  const size = asSize(node.style);

  return {
    id: node.id,
    data: {
      content: node.data.content,
      color: node.data.color ?? DEFAULT_NOTE_COLOR,
    },
    position: node.position,
    ...(size ? { style: size } : {}),
    ...(node.zIndex === undefined ? {} : { zIndex: node.zIndex }),
  };
}

/**
 * Serializes canvas state for `POST`/`PUT /api/workflows`.
 *
 * Key order is fixed here rather than incidental, because the string this
 * produces is also what tells the editor whether anything has changed.
 */
export function toGraph(
  nodes: WorkflowNode[],
  edges: Edge[],
  passthrough: GraphPassthrough = EMPTY_PASSTHROUGH,
): WorkflowGraph {
  const graphNodes: GraphNode[] = [];
  const notes: GraphNote[] = [];
  const chatModels: GraphChatModel[] = [];

  /*
   * Where each model is attached, read off the sub-edges before they are dropped below.
   * The attachment survives as a field on the model rather than as an edge, so it can't
   * reach the backend's DAG as a link into a node that isn't in `nodes`.
   */
  const attachedTo = new Map<string, string>();
  for (const edge of edges) {
    if (edge.type === SUB_EDGE_TYPE) attachedTo.set(edge.source, edge.target);
  }

  for (const node of nodes) {
    if (!node.type) continue;

    const note = toGraphNote(node);
    if (note) {
      notes.push(note);
      continue;
    }

    const chatModel = toGraphChatModel(node, attachedTo.get(node.id) ?? null);
    if (chatModel) {
      chatModels.push(chatModel);
      continue;
    }

    const type = BACKEND_TYPE_BY_UI[node.type];
    if (!type) continue;

    const size = asSize(node.style);
    graphNodes.push({
      id: node.id,
      type,
      uiType: node.type,
      data: toBackendData(node),
      position: node.position,
      ...(size ? { style: size } : {}),
      ...(node.zIndex === undefined ? {} : { zIndex: node.zIndex }),
      ...(node.deletable === false ? { deletable: false } : {}),
    });
  }

  /*
   * Every id that made it into `nodes` above. An edge is only written if both of its
   * ends are in here — the mirror of what `fromGraph` does on the way in.
   *
   * This is what keeps a canvas-only node from leaking into the backend's DAG by way of
   * an edge. Attachments are already excluded by type, but nothing stops a chain edge
   * being drawn out of a model by hand, and writing that would hand the executor a
   * dependency on a node it has no record of.
   */
  const serialized = new Set(graphNodes.map((node) => node.id));

  const graphEdges: GraphEdge[] = edges
    .filter(
      (edge) =>
        edge.type !== SUB_EDGE_TYPE && serialized.has(edge.source) && serialized.has(edge.target),
    )
    .map((edge) => ({
      id: edge.id,
      type: edge.type,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    }));

  return {
    nodes: [...graphNodes, ...passthrough.nodes],
    edges: [...graphEdges, ...passthrough.edges],
    notes,
    chatModels,
  };
}

/**
 * What the editor compares to decide whether there is anything to save.
 *
 * Derived from the serialized graph rather than from React Flow's change events:
 * selecting a node, hovering it, or React Flow measuring it all fire changes that
 * mean nothing to the backend, and treating those as edits would have autosave
 * running on every click.
 */
export function canonicalGraphJson(
  nodes: WorkflowNode[],
  edges: Edge[],
  passthrough?: GraphPassthrough,
): string {
  return JSON.stringify(toGraph(nodes, edges, passthrough));
}
