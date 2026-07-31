"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Ellipsis, MousePointerClick, Play, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NodeActionBar } from "@/components/workflow/node-action-bar";
import { NodeAddTail } from "@/components/workflow/node-add-tail";
import { NodeRunBadge, RUN_TONE_CARD, useRunTone } from "@/components/workflow/run-status";
import { cn } from "@/lib/utils";

export type NodeAction = "execute" | "toggle" | "more";

export type ManualTriggerData = {
  label: string;
  onAction?: (action: NodeAction, nodeId: string) => void;
};

export type ManualTriggerNodeType = Node<ManualTriggerData, "manualTrigger">;

export const MANUAL_TRIGGER_LABEL = "Manual Trigger to start Workflow!";

const TOOLBAR_ACTIONS = [
  { action: "execute", label: "Execute node", Icon: Play },
  { action: "toggle", label: "Deactivate node", Icon: Power },
  { action: "more", label: "More options", Icon: Ellipsis },
] as const satisfies readonly { action: NodeAction; label: string; Icon: typeof Play }[];

function ManualTriggerNodeComponent({ id, data, selected }: NodeProps<ManualTriggerNodeType>) {
  const tone = useRunTone(id);

  return (
    <div className="group relative">
      <NodeActionBar forceVisible={selected}>
        {TOOLBAR_ACTIONS.map(({ action, label, Icon }) => (
          <Button
            key={action}
            aria-label={label}
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => data.onAction?.(action, id)}
          >
            <Icon />
          </Button>
        ))}
      </NodeActionBar>
      <div
        className={cn(
          "flex size-28 items-center justify-center rounded-l-[2.25rem] rounded-r-xl border bg-card transition-colors",
          "group-hover:border-muted-foreground/35",
          selected && "border-brand/60 ring-3 ring-brand/50",
          RUN_TONE_CARD[tone],
        )}
      >
        <MousePointerClick
          className="size-9 text-muted-foreground transition-colors group-hover:text-foreground"
          strokeWidth={1.5}
        />
      </div>
      <div className="pointer-events-none absolute right-1.5 bottom-1.5 flex">
        <NodeRunBadge nodeId={id} />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="size-2.5 border-2 border-muted-foreground/45 bg-background transition-colors hover:border-brand"
      />
      <NodeAddTail nodeId={id} />
      <p className="pointer-events-none absolute top-full left-1/2 mt-3 w-44 -translate-x-1/2 text-center text-[13px] leading-snug font-medium tracking-normal">
        {data.label}
      </p>
    </div>
  );
}

export const ManualTriggerNode = memo(ManualTriggerNodeComponent);
