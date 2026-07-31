import type { Edge } from "@xyflow/react";

import type { WorkflowNode } from "@/components/workflow/types";

/*
 * What a node can reference from the nodes feeding into it.
 *
 * The backend resolves `{{<nodeId>.<field>}}` against a context keyed by node id —
 * `context.put(node.id(), result.getOutput())` in WorkflowExecutionService — so the
 * set of valid tokens at any point is decided entirely by the graph's shape. That
 * makes this a pure question about nodes and edges, and it is answered here rather
 * than inside an editor panel: the traversal is the part worth being able to read
 * on its own.
 *
 * Getting this right matters more than a convenience usually would. TemplateResolver
 * *throws* on a reference it can't resolve, so a token this module fails to offer is
 * one the user types by hand and possibly gets wrong, and a wrong token fails the
 * node at run time.
 */

export type UpstreamRef = {
  /** Ready to drop into a field, braces included. */
  token: string;
  /** The field on its own, for display: `rows`, `customers`. */
  field: string;
};

export type UpstreamGroup = {
  /** Unique per group — two groups can describe the same node. */
  key: string;
  /** The node's kind, as the catalog names it. */
  title: string;
  /** Shown beside the title, in mono. The node id, where there is one. */
  subtitle?: string;
  refs: UpstreamRef[];
  /** What the fields contain, when it can be known. */
  note?: string;
};

const MAX_NOTE_COLUMNS = 6;

function columnNote(columns: string[]): string | undefined {
  if (columns.length === 0) return undefined;
  const rest = columns.length - MAX_NOTE_COLUMNS;
  return `Columns: ${columns.slice(0, MAX_NOTE_COLUMNS).join(", ")}${rest > 0 ? `, +${rest} more` : ""}`;
}

/**
 * The fields one node exposes, or null when it exposes none.
 *
 * The manual trigger is deliberately empty. `TRIGGER` accepts an optional
 * `payload`, but no example in the API confirms how it is addressed, and offering a
 * guessed `{{t.payload}}` would put a token in a user's config that resolves to
 * nothing — which fails the node rather than degrading quietly.
 */
function describe(node: WorkflowNode): UpstreamGroup | null {
  const ref = (field: string): UpstreamRef => ({ token: `{{${node.id}.${field}}}`, field });
  const group = (refs: UpstreamRef[], title: string, note?: string): UpstreamGroup => ({
    key: `node:${node.id}`,
    title,
    subtitle: node.id,
    refs,
    ...(note ? { note } : {}),
  });

  switch (node.type) {
    case "datasource": {
      /*
       * `rows` is the whole output — DataSourceNodeExecutor returns
       * Map.of("rows", rows) and nothing else. The columns are a note rather than
       * tokens because they describe what is inside one row, and a row's fields are
       * addressed as `{{item.name}}` while iterating, never from here.
       */
      const columns = node.data.file?.columns.filter(Boolean) ?? [];
      return group([ref("rows")], "Datasource", columnNote(columns));
    }

    case "ai": {
      const named = node.data.output.filter((field) => field.name.trim());
      /*
       * An AI node with no declared output fields is not silent: AiNodeExecutor
       * falls back to Map.of("text", raw) when the schema is empty, so the whole
       * model response is readable as one string.
       */
      if (named.length === 0) {
        return group(
          [ref("text")],
          "AI",
          "No output fields declared, so the whole response arrives as text.",
        );
      }
      return group(
        named.map((field) => ref(field.name)),
        "AI",
      );
    }

    default:
      return null;
  }
}

/**
 * Ancestors of `nodeId`, nearest first. Cycle-safe; React Flow will let one be drawn.
 *
 * Exported because `email-autofill` needs the same answer for a different question.
 * It reads the field *types* off an AI node, which `describe` below discards — but
 * "what can this node see" has one right answer, and two traversals could disagree
 * about it.
 *
 * Every ancestor is fair game, not just the direct feeders: the executor resolves
 * templates against `context`, which holds every completed node's output keyed by id
 * (`NodeExecutionContext.context`). So an email node can reference the CSV two hops
 * back, with an AI node in between.
 */
export function ancestors(nodes: WorkflowNode[], edges: Edge[], nodeId: string): WorkflowNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const feeders = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = feeders.get(edge.target);
    if (existing) existing.push(edge.source);
    else feeders.set(edge.target, [edge.source]);
  }

  const found: WorkflowNode[] = [];
  const visited = new Set([nodeId]);
  let frontier = feeders.get(nodeId) ?? [];

  while (frontier.length > 0) {
    const next: string[] = [];

    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);

      // Absent means a node this canvas carries but can't draw, and a node it
      // can't draw is one whose outputs it can't describe either.
      const node = byId.get(id);
      if (node) found.push(node);

      next.push(...(feeders.get(id) ?? []));
    }

    frontier = next;
  }

  return found;
}

/**
 * Everything `nodeId` can reference, nearest feeder first — the order config is
 * usually written in.
 */
export function upstreamFields(
  nodes: WorkflowNode[],
  edges: Edge[],
  nodeId: string,
): UpstreamGroup[] {
  const groups: UpstreamGroup[] = [];
  for (const node of ancestors(nodes, edges, nodeId)) {
    const group = describe(node);
    if (group) groups.push(group);
  }
  return groups;
}

/**
 * The `{{item.*}}` fields available while iterating, or null when none can be named.
 *
 * Only meaningful inside a `forEach`: EmailOutputNodeExecutor builds one scope per
 * element with `scope.put("item", element)`, so `item` simply does not exist
 * otherwise.
 *
 * The names come from the nearest upstream CSV, which is honest for the common case
 * — `forEach` pointing at `{{ds.rows}}`, whose elements are row maps keyed by
 * header. It is a guess when `forEach` points at an AI-produced array instead, since
 * the element shape is then whatever the model returned. The note says so rather
 * than presenting these as certain.
 */
export function itemFields(
  nodes: WorkflowNode[],
  edges: Edge[],
  nodeId: string,
): UpstreamGroup | null {
  for (const node of ancestors(nodes, edges, nodeId)) {
    if (node.type !== "datasource") continue;
    const columns = node.data.file?.columns.filter(Boolean) ?? [];
    if (columns.length === 0) continue;

    return {
      key: "item",
      title: "Current item",
      refs: columns.map((column) => ({ token: `{{item.${column}}}`, field: column })),
      note: `Columns of ${node.id}. If this list comes from an AI node instead, its fields are whatever the model returned.`,
    };
  }

  return null;
}
