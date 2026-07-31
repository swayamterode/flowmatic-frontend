import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRightIcon, ClockIcon, MousePointerClickIcon, WebhookIcon } from "lucide-react";

type Execution = {
  workflow: string;
  /** Node the run finished on, or stopped at when it failed. */
  lastNode: string;
  trigger: "webhook" | "schedule" | "manual";
  durationMs: number;
  state: "failed" | "success" | "running" | "waiting";
};

const rows: Execution[] = [
  {
    workflow: "Stripe → Slack alerts",
    lastNode: "Send channel message",
    trigger: "webhook",
    durationMs: 840,
    state: "success",
  },
  {
    workflow: "Invoice OCR pipeline",
    lastNode: "Extract document fields",
    trigger: "webhook",
    durationMs: 12_400,
    state: "failed",
  },
  {
    workflow: "Nightly CRM sync",
    lastNode: "Upsert contacts",
    trigger: "schedule",
    durationMs: 184_000,
    state: "running",
  },
  {
    workflow: "Lead enrichment",
    lastNode: "Wait for approval",
    trigger: "manual",
    durationMs: 2100,
    state: "waiting",
  },
];

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  if (seconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function statusVariant(state: Execution["state"]): ComponentProps<typeof Badge>["variant"] {
  if (state === "failed") {
    return "destructive";
  }
  if (state === "waiting") {
    return "outline";
  }
  return "secondary";
}

function statusLabel(state: Execution["state"]): string {
  if (state === "failed") {
    return "Failed";
  }
  if (state === "waiting") {
    return "Waiting";
  }
  if (state === "running") {
    return "Running";
  }
  return "Success";
}

function triggerIcon(trigger: Execution["trigger"]) {
  if (trigger === "webhook") {
    return <WebhookIcon className="size-3.5 shrink-0" />;
  }
  if (trigger === "schedule") {
    return <ClockIcon className="size-3.5 shrink-0" />;
  }
  return <MousePointerClickIcon className="size-3.5 shrink-0" />;
}

export function RecentExecutions({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card className={cn("gap-0 shadow-none md:col-span-2 dark:ring-0", className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>Recent executions</CardTitle>
        <CardDescription>Latest 4 runs across your workflows</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Workflow</TableHead>
              <TableHead className="hidden sm:table-cell">Last node</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="pr-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              return (
                <TableRow className="h-14 hover:bg-transparent" key={`${r.workflow}-${r.lastNode}`}>
                  <TableCell className="max-w-36 truncate pl-6 font-medium">{r.workflow}</TableCell>
                  <TableCell className="hidden max-w-32 sm:table-cell">
                    <span className="line-clamp-1 text-sm text-muted-foreground">{r.lastNode}</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-sm font-medium capitalize">
                      {triggerIcon(r.trigger)}
                      {r.trigger}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                    {formatDuration(r.durationMs)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Badge variant={statusVariant(r.state)}>{statusLabel(r.state)}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex justify-center border-t py-3">
          <Button
            size="sm"
            variant="ghost"
            render={<a href="#/executions/running" />}
            nativeButton={false}
          >
            View all executions
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
