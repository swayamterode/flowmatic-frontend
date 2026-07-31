"use client";

import { useNodesData } from "@xyflow/react";

import { AiNodeEditor } from "@/components/workflow/ai-node-editor";
import { EmailNodeEditor } from "@/components/workflow/email-node-editor";
import type { WorkflowNode } from "@/components/workflow/types";

/*
 * Picks the config panel for whichever node the canvas was asked to open.
 *
 * The canvas holds one `nodeEditor` overlay rather than one kind per node type, so
 * this is the single place that maps a node to its editor. FILTER, CONDITION and
 * HTTP all want a panel eventually, and each should be one case here instead of a
 * new member of the canvas's union and a new branch in its JSX.
 */

type NodeEditorPanelProps = {
  nodeId: string;
  onClose: () => void;
};

/** True for nodes that have a config panel — the canvas checks before opening one. */
export function hasNodeEditor(node: WorkflowNode): boolean {
  return node.type === "ai" || node.type === "email";
}

export function NodeEditorPanel({ nodeId, onClose }: NodeEditorPanelProps) {
  const node = useNodesData<WorkflowNode>(nodeId);

  switch (node?.type) {
    case "ai":
      /*
       * Keyed by node: opening a second AI node while the panel is already showing
       * one reuses this position in the tree, and the AI panel now holds state that
       * belongs to a single node — an in-flight prompt refine, and the text it
       * replaced. Without the key that refine would land in whichever node the user
       * switched to.
       */
      return <AiNodeEditor key={nodeId} nodeId={nodeId} onClose={onClose} />;
    case "email":
      return <EmailNodeEditor nodeId={nodeId} onClose={onClose} />;
    default:
      // Either the node is gone or it has no panel; the canvas closes the overlay
      // in the same render, so this is only the frame in between.
      return null;
  }
}
