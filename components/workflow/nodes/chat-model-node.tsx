"use client";

import { memo } from "react";
import {
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
  type XYPosition,
} from "@xyflow/react";
import { Cpu, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NodeActionBar } from "@/components/workflow/node-action-bar";
import { nextId, NODE_Z_INDEX } from "@/components/workflow/node-defaults";
import { cn } from "@/lib/utils";

/*
 * The model an AI card runs on, as a node of its own — draggable, selectable and
 * deletable like any other. It hangs off the card's Chat Model slot through a dashed
 * sub-edge rather than sitting in the chain, because it isn't a step: nothing flows
 * through it, it supplies the card beside it.
 *
 * Canvas-only. There is no `BackendNodeType` for a model and the executor never reads
 * one — every AI node runs on Groq server-side — so this serializes under the graph's
 * own `chatModels` key, the way sticky notes serialize under `notes`. Keeping it out of
 * `nodes` is what stops it reaching the backend's DAG as a step with no executor.
 */

/** Widened when a second provider actually exists. Today the list is one long. */
export type ChatModelProvider = "groq";

/*
 * A `type` rather than an interface: React Flow's node data has to satisfy
 * Record<string, unknown>, and only type aliases get an implicit index signature.
 */
export type ChatModelData = { provider: ChatModelProvider };

export type ChatModelNodeType = Node<ChatModelData, "chatModel">;

export const CHAT_MODEL_DIAMETER = 64;

/*
 * A circle, so unlike the cards this really is its final size — nothing inside it
 * grows. Still not pinned through `style`: the manual trigger sizes itself in CSS
 * too, and letting the DOM own it keeps one definition of how big it is.
 */
export const CHAT_MODEL_DEFAULT_SIZE = { width: CHAT_MODEL_DIAMETER, height: CHAT_MODEL_DIAMETER };

export const CHAT_MODEL_LABEL = "Groq Chat Model";

/** Fixed id, so mashing the node replaces the toast instead of stacking copies. */
const TOAST_ID = "chat-model-groq";

const GROQ_ONLY_MESSAGE = "As of now only Groq AI model is available";

export function createChatModelNode(position: XYPosition): ChatModelNodeType {
  return {
    id: nextId("chat-model"),
    type: "chatModel",
    position,
    zIndex: NODE_Z_INDEX,
    data: { provider: "groq" },
  };
}

function ChatModelNodeComponent({ id, selected }: NodeProps<ChatModelNodeType>) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="group relative">
      <NodeActionBar forceVisible={selected}>
        <Button
          aria-label="Delete node"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => void deleteElements({ nodes: [{ id }] })}
        >
          <Trash2 />
        </Button>
      </NodeActionBar>

      {/*
       * No `nodrag`, unlike every other button on the canvas. That class is how an
       * interactive element opts out of starting a drag, and here the button *is* the
       * node — opting out would make the one node you can't move. A press that never
       * travels still lands as a click, so it stays draggable and clickable both.
       */}
      <button
        type="button"
        aria-label={CHAT_MODEL_LABEL}
        className={cn(
          "flex size-16 items-center justify-center rounded-full border bg-card outline-none",
          "transition-colors group-hover:border-muted-foreground/35",
          selected && "border-brand/60 ring-3 ring-brand/50",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        onClick={() => toast(GROQ_ONLY_MESSAGE, { id: TOAST_ID })}
      >
        <Cpu
          className="size-7 text-muted-foreground transition-colors group-hover:text-foreground"
          strokeWidth={1.5}
        />
      </button>

      {/*
       * Source, not target: the model supplies the card. Top, so the dashed link runs
       * straight up into the slot under the card rather than looping around.
       */}
      <Handle
        type="source"
        position={Position.Top}
        className="size-2.5 border-2 border-muted-foreground/45 bg-background transition-colors hover:border-brand"
      />

      {/* Absolute, so the caption can't inflate the node's measured height. */}
      <p className="pointer-events-none absolute top-full left-1/2 mt-2 w-32 -translate-x-1/2 text-center text-[12px] leading-snug font-medium">
        {CHAT_MODEL_LABEL}
      </p>
    </div>
  );
}

export const ChatModelNode = memo(ChatModelNodeComponent);
