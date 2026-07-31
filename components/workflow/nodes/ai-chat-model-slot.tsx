"use client";

import { Handle, Position, useNodeConnections, useReactFlow } from "@xyflow/react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AI_CHAT_MODEL_HANDLE, subEdge } from "@/components/workflow/graph-ops";
import {
  CHAT_MODEL_DIAMETER,
  createChatModelNode,
} from "@/components/workflow/nodes/chat-model-node";

/*
 * The socket under an AI card where its model attaches: a diamond handle, a label, and
 * — while nothing is attached — a dashed `+` that puts a Groq model there.
 *
 * The same reasoning as `NodeAddTail`, one axis over. The `+` shows only while the slot
 * is free, because once a model is attached the model node and its dashed link say so
 * themselves, and a second control offering to attach another would quietly allow two.
 *
 * No required-marker on the label, despite n8n's red asterisk in the same spot. Nothing
 * here is required: the backend runs every AI node on Groq whether or not a model node
 * is on the canvas, so flagging an empty slot as an error would be a warning about a
 * workflow that in fact runs fine.
 */

/** Gap between the bottom of the card and the top of its model. */
const DROP = 96;

export function AiChatModelSlot({ nodeId }: { nodeId: string }) {
  const { getNode, addNodes, addEdges } = useReactFlow();
  /*
   * Filtered by handle, not just by type — the card already has an unnamed target on
   * its left for the chain, and counting in aggregate would read an incoming chain
   * connection as a model and hide the `+`.
   */
  const connections = useNodeConnections({
    handleType: "target",
    handleId: AI_CHAT_MODEL_HANDLE,
  });

  const attach = () => {
    const card = getNode(nodeId);
    /*
     * Bails rather than guessing at a fallback size. `measured` is filled in by React
     * Flow the first time it lays the node out, so anything the user can physically
     * click has it — and placing a model from a guessed height is how it ends up
     * overlapping the card it belongs to.
     */
    if (!card?.measured?.width || !card.measured.height) return;

    const node = createChatModelNode({
      x: card.position.x + card.measured.width / 2 - CHAT_MODEL_DIAMETER / 2,
      y: card.position.y + card.measured.height + DROP,
    });

    addNodes(node);
    addEdges(subEdge(node.id, nodeId, AI_CHAT_MODEL_HANDLE));
  };

  return (
    <>
      <Handle
        id={AI_CHAT_MODEL_HANDLE}
        type="target"
        position={Position.Bottom}
        /*
         * A diamond, to read as a different kind of connection from the round chain
         * handles — `rounded-none` because React Flow's own handle styling rounds it.
         */
        className="size-2.5 rotate-45 rounded-none border-2 border-muted-foreground/45 bg-background transition-colors hover:border-brand"
      />

      {/* Inert column, with only the `+` opting back in — a transparent block over the
          canvas would otherwise swallow drags to pan beside the label. */}
      <div className="pointer-events-none absolute top-full left-1/2 flex -translate-x-1/2 flex-col items-center">
        <span className="mt-2.5 text-[11px] leading-none text-muted-foreground">Chat Model</span>

        {connections.length === 0 && (
          <>
            {/* `w-0` with a left border, not `w-px` — a bordered 1px box draws 2px wide. */}
            <span aria-hidden className="mt-2 h-8 w-0 border-l border-dashed border-border" />
            <Button
              aria-label="Add chat model"
              size="icon-sm"
              variant="ghost"
              className="nodrag nopan pointer-events-auto border border-dashed bg-card text-muted-foreground hover:border-brand/50 hover:bg-card hover:text-brand"
              onClick={attach}
            >
              <Plus />
            </Button>
          </>
        )}
      </div>
    </>
  );
}
