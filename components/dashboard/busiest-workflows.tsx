"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusIndicator } from "@/components/dashboard/indicator";
import { formatInteger } from "@/components/dashboard/formater";
import { EllipsisIcon, PauseIcon, PencilIcon, PlayIcon } from "lucide-react";

type Workflow = {
  id: string;
  name: string;
  status: "Active" | "Paused";
  /** Executions of this workflow so far today */
  runs: number;
};

const INITIAL_WORKFLOWS: readonly Workflow[] = [
  {
    id: "stripe-slack-alerts",
    name: "Stripe → Slack alerts",
    status: "Active",
    runs: 1204,
  },
  {
    id: "zendesk-ticket-triage",
    name: "Zendesk ticket triage",
    status: "Active",
    runs: 512,
  },
  {
    id: "invoice-ocr-pipeline",
    name: "Invoice OCR pipeline",
    status: "Active",
    runs: 340,
  },
  {
    id: "nightly-crm-sync",
    name: "Nightly CRM sync",
    status: "Active",
    runs: 96,
  },
  {
    id: "lead-enrichment",
    name: "Lead enrichment",
    status: "Paused",
    runs: 0,
  },
];

/** First letter of the first two meaningful words, skipping arrows/symbols. */
function getInitials(name: string) {
  return name
    .split(/[\s→]+/)
    .filter((word) => /^[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function BusiestWorkflows({ className, ...props }: ComponentProps<typeof Card>) {
  const [workflows, setWorkflows] = useState<Workflow[]>(() => [...INITIAL_WORKFLOWS]);

  function toggleStatus(id: string) {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, status: w.status === "Active" ? "Paused" : "Active" } : w,
      ),
    );
  }

  return (
    <Card className={cn("shadow-none dark:ring-0", className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>Busiest workflows</CardTitle>
        <CardDescription>Most executions in your workspace today</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="flex flex-col divide-y divide-border">
          {workflows.map((w) => (
            <li className="flex items-center gap-2 p-3 first:pt-0 last:pb-0 sm:gap-3" key={w.id}>
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md text-[10px]">
                  {getInitials(w.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 pr-1">
                <p className="truncate text-sm leading-snug font-medium text-foreground">
                  {w.name}
                </p>
                <p className="flex items-center gap-2 text-[10px] leading-snug">
                  <span className="flex shrink-0 items-center gap-1">
                    <StatusIndicator
                      color={w.status === "Active" ? "emerald" : "amber"}
                      pulse={w.status === "Active"}
                    />
                    {w.status}
                  </span>
                  <span className="inline-flex size-1 rounded-full bg-foreground/80" />
                  <span className="tabular-nums">{formatInteger(w.runs)} runs</span>
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button aria-label={`Actions for ${w.name}`} size="icon-xs" variant="ghost" />
                  }
                >
                  <EllipsisIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {w.name}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2">
                      <PencilIcon className="size-4 opacity-70" />
                      Open editor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onSelect={() => {
                        toggleStatus(w.id);
                      }}
                    >
                      {w.status === "Active" ? (
                        <PauseIcon className="size-4 opacity-70" />
                      ) : (
                        <PlayIcon className="size-4 opacity-70" />
                      )}
                      {w.status === "Active" ? "Pause workflow" : "Resume workflow"}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
