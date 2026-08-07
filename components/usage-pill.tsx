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
        <TooltipTrigger>
          <Badge variant="outline" className="text-muted-foreground">
            Unlimited
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{planLabel(usage.plan)} plan</TooltipContent>
      </Tooltip>
    );
  }

  const { used, limit, remaining } = usage;
  const tone: Tone =
    remaining === 0
      ? "blocked"
      : limit !== null && remaining !== null && remaining / limit <= 0.2
        ? "low"
        : "normal";
  const label = `${used} / ${limit} runs`;

  return (
    <Tooltip>
      {tone === "normal" ? (
        <TooltipTrigger>
          <Badge variant="outline" className={TONE.normal}>
            {label}
          </Badge>
        </TooltipTrigger>
      ) : (
        <TooltipTrigger render={<Link href="/pricing" />}>
          <Badge variant="outline" className={cn(TONE[tone], "cursor-pointer")}>
            {label}
          </Badge>
        </TooltipTrigger>
      )}
      <TooltipContent>{planLabel(usage.plan)} plan</TooltipContent>
    </Tooltip>
  );
}
