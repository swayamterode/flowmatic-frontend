"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkflowUsage } from "@/components/workflow-usage-provider";
import { cn } from "@/lib/utils";
import type { WorkflowPlan } from "@/types/usage.types";

function planLabel(plan: WorkflowPlan): string {
  switch (plan) {
    case "ESSENTIALS":
      return "Essentials";
    case "PRO":
      return "Pro";
    case "ENTERPRISE":
      return "Enterprise";
    default:
      return "Free";
  }
}

type Tone = "normal" | "low" | "blocked";

/** Tone classes layered onto Badge's `outline` variant — mirrors run-status.tsx's RUN_TONE_CARD pattern. */
const TONE: Record<Tone, string> = {
  normal: "text-muted-foreground",
  low: "border-brand/40 text-brand",
  blocked: "border-destructive/40 text-destructive",
};

/** Roomier than a plain Badge so the ring has space to breathe — a card fill gives it presence next to the other flat header icons. */
const PILL_CLASS = "h-[26px] gap-1.5 border bg-card pl-1.5 pr-2.5";

const RING_SIZE = 20;
const RING_RADIUS = 8;
const RING_STROKE = 2.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * How much of the cap is used, as a ring. Always drawn in brand — the tone
 * colors (border/text) are what escalate as the cap gets close, so the ring
 * doesn't introduce a second alarm color of its own. Nested inside a span
 * rather than a direct child of Badge, so Badge's own `[&>svg]:size-3!` rule
 * doesn't shrink it.
 */
function UsageRing({ fraction }: { fraction: number }) {
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(Math.max(fraction, 0), 1));
  return (
    <span className="shrink-0">
      <svg aria-hidden className="size-4 -rotate-90" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-border"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-brand"
        />
      </svg>
    </span>
  );
}

/**
 * The signed-in user's run usage, always visible in the header. Renders
 * nothing while the first fetch is in flight, so it never flashes a wrong
 * number.
 */
export function UsagePill() {
  const { usage, loading } = useWorkflowUsage();
  if (loading || !usage) return null;

  if (usage.unlimited) {
    return (
      <Tooltip>
        <TooltipTrigger render={<Badge variant="outline" className={TONE.normal} />}>
          Unlimited
        </TooltipTrigger>
        <TooltipContent>{planLabel(usage.plan)} plan</TooltipContent>
      </Tooltip>
    );
  }

  const { used, limit, remaining } = usage;
  if (typeof limit !== "number" || typeof remaining !== "number") return null;

  const tone: Tone = remaining <= 0 ? "blocked" : remaining / limit <= 0.2 ? "low" : "normal";
  const label = `${used} / ${limit} runs`;
  const fraction = limit > 0 ? used / limit : 0;

  return (
    <Tooltip>
      {tone === "normal" ? (
        <TooltipTrigger
          render={<Badge variant="outline" className={cn(PILL_CLASS, TONE.normal)} />}
        >
          <UsageRing fraction={fraction} />
          {label}
        </TooltipTrigger>
      ) : (
        <TooltipTrigger render={<Link href="/pricing" />}>
          <Badge variant="outline" className={cn(PILL_CLASS, TONE[tone], "cursor-pointer")}>
            <UsageRing fraction={fraction} />
            {label}
          </Badge>
        </TooltipTrigger>
      )}
      <TooltipContent>{planLabel(usage.plan)} plan</TooltipContent>
    </Tooltip>
  );
}
