"use client";

import type { LucideIcon } from "lucide-react";
import { Database, Mail, MousePointerClick, Play, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRunTone } from "@/components/workflow/run-status";
import type { WorkflowNode } from "@/components/workflow/types";
import { cn } from "@/lib/utils";

/*
 * The persistent strip of tabs at the canvas's right edge: one per real
 * workflow step, plus Run and Add-node. It never resizes and never
 * disappears — the slide-out panel beside it is what shows or hides, so
 * running the workflow no longer costs you whatever node you had open.
 */

export type TabSelection =
  { kind: "node"; nodeId: string } | { kind: "run" } | { kind: "catalog" } | null;

export function isSameTab(a: TabSelection, b: TabSelection): boolean {
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  return a.kind === "node" && b.kind === "node" ? a.nodeId === b.nodeId : true;
}

/** The rail's fixed width in pixels — it never resizes, unlike the panel beside it. */
export const RAIL_WIDTH = 44;

const NODE_TAB_META = {
  manualTrigger: { label: "Trigger", Icon: MousePointerClick },
  datasource: { label: "Datasource", Icon: Database },
  ai: { label: "AI", Icon: Sparkles },
  email: { label: "Email", Icon: Mail },
} satisfies Record<string, { label: string; Icon: LucideIcon }>;

type RailNodeType = keyof typeof NODE_TAB_META;

function isRailNodeType(type: string): type is RailNodeType {
  return type in NODE_TAB_META;
}

/** True for the node types the backend actually records a run for — a Chat Model or a sticky note never is. */
export function isRailNode(node: WorkflowNode): boolean {
  return isRailNodeType(node.type);
}

/** Rail-eligible nodes, left to right by canvas position — the same order the flow reads in. */
export function orderedRailNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes
    .filter(isRailNode)
    .slice()
    .sort((a, b) => {
      const dx = a.position.x - b.position.x;
      if (dx !== 0) return dx;
      const dy = a.position.y - b.position.y;
      if (dy !== 0) return dy;
      return a.id.localeCompare(b.id);
    });
}

const DOT_TONE: Record<"running" | "success" | "failure", string> = {
  running: "bg-brand",
  success: "bg-run-success",
  failure: "bg-destructive",
};

type RailTabButtonProps = {
  active: boolean;
  label: string;
  tooltip?: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
};

function RailTabButton({ active, label, tooltip, onClick, children }: RailTabButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-expanded={active}
            aria-label={label}
            size="icon"
            variant="ghost"
            className="relative shrink-0"
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="left">{tooltip ?? label}</TooltipContent>
    </Tooltip>
  );
}

type RailNodeTabProps = {
  node: WorkflowNode;
  badge: number | null;
  active: boolean;
  onSelect: () => void;
};

function RailNodeTab({ node, badge, active, onSelect }: RailNodeTabProps) {
  const meta = NODE_TAB_META[node.type as RailNodeType];
  const tone = useRunTone(node.id);
  const Icon = meta.Icon;

  return (
    <RailTabButton
      active={active}
      label={`${meta.label} ${node.id}`}
      tooltip={`${meta.label} · ${node.id}`}
      onClick={onSelect}
    >
      <Icon className="size-4" strokeWidth={1.75} />
      {badge !== null && (
        <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-muted-foreground/80 text-[9px] font-medium text-background">
          {badge}
        </span>
      )}
      {tone !== "neutral" && (
        <span
          className={cn(
            "absolute right-0 bottom-0 size-2 rounded-full ring-2 ring-background",
            DOT_TONE[tone],
          )}
        />
      )}
    </RailTabButton>
  );
}

type NodeRailProps = {
  nodes: WorkflowNode[];
  selected: TabSelection;
  busy: boolean;
  onSelect: (tab: TabSelection) => void;
  className?: string;
};

export function NodeRail({ nodes, selected, busy, onSelect, className }: NodeRailProps) {
  const steps = orderedRailNodes(nodes);
  const countByType = new Map<string, number>();
  for (const node of steps) countByType.set(node.type, (countByType.get(node.type) ?? 0) + 1);
  const seen = new Map<string, number>();

  return (
    <aside
      aria-label="Node tabs"
      style={{ width: RAIL_WIDTH }}
      className={cn(
        "flex h-full shrink-0 flex-col items-center gap-1 border-l bg-background py-2",
        className,
      )}
    >
      {steps.map((node) => {
        const total = countByType.get(node.type) ?? 1;
        const index = (seen.get(node.type) ?? 0) + 1;
        seen.set(node.type, index);

        return (
          <RailNodeTab
            key={node.id}
            node={node}
            badge={total > 1 ? index : null}
            active={selected?.kind === "node" && selected.nodeId === node.id}
            onSelect={() => onSelect({ kind: "node", nodeId: node.id })}
          />
        );
      })}

      <div className="my-1 h-px w-6 shrink-0 bg-border" />

      <RailTabButton
        active={selected?.kind === "run"}
        label="Run"
        onClick={() => onSelect({ kind: "run" })}
      >
        <span className="relative flex items-center justify-center">
          <Play className="size-4" strokeWidth={1.75} />
          {busy && (
            <span className="absolute -top-1.5 -right-1.5 size-2 animate-pulse rounded-full bg-brand" />
          )}
        </span>
      </RailTabButton>

      <div className="flex-1" />

      <RailTabButton
        active={selected?.kind === "catalog"}
        label="Add node"
        tooltip={
          <>
            Add node <Kbd>N</Kbd>
          </>
        }
        onClick={() => onSelect({ kind: "catalog" })}
      >
        <Plus className="size-4" strokeWidth={1.75} />
      </RailTabButton>
    </aside>
  );
}
