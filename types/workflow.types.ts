export type BackendNodeType =
  "TRIGGER" | "DATA_SOURCE" | "AI" | "OUTPUT" | "HTTP" | "FILTER" | "TRANSFORM" | "CONDITION";

export interface GraphPosition {
  x: number;
  y: number;
}

export interface GraphSize {
  width?: number;
  height?: number;
}

export interface GraphNode {
  id: string;

  type: BackendNodeType;
  uiType?: string;
  data: Record<string, unknown>;
  position: GraphPosition;
  style?: GraphSize;
  zIndex?: number;
  deletable?: boolean;
}

export interface GraphEdge {
  id?: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/**
 * A sticky note. Deliberately not a `GraphNode`: `type` deserializes to the
 * NodeType enum on the backend, so a note in `nodes` would fail the whole graph
 * parse at run time. Under its own key it round-trips and the executor never
 * sees it.
 */
export interface GraphNote {
  id: string;
  data: { content: string; color?: string };
  position: GraphPosition;
  style?: GraphSize;
  zIndex?: number;
}

/**
 * A chat model attached to an AI node. Not a `GraphNode`, for the same reason a note
 * isn't: `type` deserializes to the NodeType enum on the backend, and there is no
 * enum member for a model — the executor picks the provider itself. Under its own key
 * it round-trips and the executor never sees it.
 *
 * The attachment is a field rather than an entry in `edges`, so the backend's DAG can
 * never receive a link pointing at a node it has no record of. `null` is a model
 * sitting unattached on the canvas.
 */
export interface GraphChatModel {
  id: string;
  attachedTo: string | null;
  data: { provider: string };
  position: GraphPosition;
  style?: GraphSize;
  zIndex?: number;
}

export interface WorkflowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  notes?: GraphNote[];
  chatModels?: GraphChatModel[];
}

/** Returned by GET /api/workflows and POST /api/workflows. */
export interface WorkflowSummary {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Returned by GET and PUT /api/workflows/{id} — a summary plus the graph. */
export interface WorkflowDetail extends WorkflowSummary {
  graph: WorkflowGraph;
}

/** Both fields are required on create. */
export interface CreateWorkflowRequest {
  name: string;
  graph: WorkflowGraph;
}

/** Each field is optional on update — send only what changed. */
export interface UpdateWorkflowRequest {
  name?: string;
  graph?: WorkflowGraph;
}
