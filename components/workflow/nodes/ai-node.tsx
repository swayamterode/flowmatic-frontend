"use client";

import { memo } from "react";
import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Sparkles, SlidersHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hasOutputProblem, type AiData } from "@/components/workflow/ai-fields";
import { useRequestEditor } from "@/components/workflow/editor-target";
import { NodeActionBar } from "@/components/workflow/node-action-bar";
import { NodeAddTail } from "@/components/workflow/node-add-tail";
import { AiChatModelSlot } from "@/components/workflow/nodes/ai-chat-model-slot";
import { NodeRunBadge, RUN_TONE_CARD, useRunTone } from "@/components/workflow/run-status";
import { cn } from "@/lib/utils";

export type AiNodeType = Node<AiData, "ai">;

export const AI_WIDTH = 300;

/*
 * Height is an estimate used only to centre the node when it is placed — the card
 * grows with its prompt, so nothing pins it. `useWorkflowNodes` re-seats the node
 * on its chain's centre line once React Flow reports a real height.
 */
export const AI_DEFAULT_SIZE = { width: AI_WIDTH, height: 140 };

const VISIBLE_OUTPUTS = 3;

function AiNodeComponent({ id, data, selected }: NodeProps<AiNodeType>) {
  const { deleteElements } = useReactFlow();
  const requestEditor = useRequestEditor();
  const tone = useRunTone(id);

  const { prompt, output } = data;
  const named = output.filter((field) => field.name.trim());

  return (
    <div className="group relative w-full">
      <NodeActionBar forceVisible={selected}>
        <Button
          aria-label="Configure AI node"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => requestEditor(id)}
        >
          <SlidersHorizontal />
        </Button>
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

      <div
        className={cn(
          "w-full overflow-hidden rounded-xl border bg-card shadow-xs transition-colors",
          "group-hover:border-muted-foreground/35",
          selected && "border-brand/60 ring-2 ring-brand/50",
          RUN_TONE_CARD[tone],
        )}
        onDoubleClick={(event) => {
          event.stopPropagation();
          requestEditor(id);
        }}
      >
        <header className="flex h-9 items-center gap-2 border-b px-3">
          <Sparkles className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <h3 className="truncate text-[13px] font-medium tracking-tight">AI Agent</h3>
          <NodeRunBadge nodeId={id} />
        </header>

        <div className="flex flex-col gap-2 p-3">
          {prompt.trim() ? (
            <>
              <p className="line-clamp-2 text-[13px] leading-snug wrap-anywhere text-muted-foreground">
                {prompt}
              </p>

              {named.length > 0 && (
                <ul className="flex flex-wrap gap-1">
                  {named.slice(0, VISIBLE_OUTPUTS).map((field) => (
                    <li
                      key={field.name}
                      className="max-w-full truncate rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {field.name}
                    </li>
                  ))}
                  {named.length > VISIBLE_OUTPUTS && (
                    <li className="rounded-md border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      +{named.length - VISIBLE_OUTPUTS}
                    </li>
                  )}
                </ul>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-input px-3 py-5 text-center">
              <Sparkles className="size-5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[13px] leading-snug text-muted-foreground">No prompt yet</p>
              <Button
                className="nodrag no-pan"
                size="sm"
                variant="outline"
                onClick={() => requestEditor(id)}
              >
                Write prompt
              </Button>
            </div>
          )}

          {/* Not an error: with no schema the executor returns the whole response as `text`. */}
          {prompt.trim() && named.length === 0 && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              No output fields — the reply arrives as one text value.
            </p>
          )}

          {named.length > 0 && hasOutputProblem(output) && (
            <p className="text-[11px] leading-snug text-destructive">
              An output name needs fixing.
            </p>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="size-2.5 border-2 border-muted-foreground/45 bg-background transition-colors hover:border-brand"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="size-2.5 border-2 border-muted-foreground/45 bg-background transition-colors hover:border-brand"
      />

      <NodeAddTail nodeId={id} />
      <AiChatModelSlot nodeId={id} />
    </div>
  );
}

export const AiNode = memo(AiNodeComponent);
