"use client";

import { useState } from "react";
import { Check, CircleSlash, Clock, Minus, Play, Send, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { WorkflowNode } from "@/components/workflow/types";
import { RouteError, postRoute } from "@/lib/api/route-client";
import { asInstant, type NodeRun, type NodeRunStatus, type RunDetail } from "@/types/run.types";
import { cn } from "@/lib/utils";

/*
 * What the last run did, node by node.
 *
 * The backend records an output map and an error message per node specifically so a
 * run can be inspected; this is that surface. It shares the right-hand overlay with
 * the nodes catalog and the config panels.
 */

type RunPanelProps = {
  detail: RunDetail | null;
  error: string | null;
  busy: boolean;
  /** Canvas nodes, in order, so nodes the run never reached can be listed too. */
  nodes: WorkflowNode[];
  onClose: () => void;
  /** Patches a node's row after the manual-review "Send" action settles its messages. */
  onNodeUpdated: (updated: NodeRun) => void;
};

/** Canvas types that become a step the backend runs. Notes never do. */
function isStep(node: WorkflowNode): boolean {
  return node.type !== "stickyNote";
}

const STATUS_STYLE: Record<NodeRunStatus, string> = {
  SUCCESS: "text-run-success",
  FAILED: "text-destructive",
  RUNNING: "text-brand",
  PENDING: "text-muted-foreground",
  SKIPPED: "text-muted-foreground",
};

function StatusIcon({ status }: { status: NodeRunStatus }) {
  switch (status) {
    case "SUCCESS":
      return <Check className="size-3.5 shrink-0" strokeWidth={3} />;
    case "FAILED":
      return <TriangleAlert className="size-3.5 shrink-0" strokeWidth={2.5} />;
    case "SKIPPED":
      return <CircleSlash className="size-3.5 shrink-0" strokeWidth={2.5} />;
    case "RUNNING":
    case "PENDING":
      return <Spinner className="size-3.5 shrink-0" />;
  }
}

function duration(run: NodeRun): string | null {
  const started = asInstant(run.startedAt);
  const completed = asInstant(run.completedAt);
  if (!started || !completed) return null;

  const ms = completed.getTime() - started.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * One attempted (or, for a manual-review node, not-yet-attempted) send, as
 * `EmailOutputNodeExecutor` records it. Optional fields are genuinely absent on the
 * wire (e.g. `error` only exists on a failed message), not just possibly empty.
 */
type OutputMessage = {
  to: string | null;
  subject?: string;
  body?: string;
  bodyTruncated?: boolean;
  status: "SENT" | "FAILED" | "PENDING";
  error?: string;
};

type OutputSummary = {
  sent: number;
  total: number;
  messages: OutputMessage[];
  messagesTruncated: boolean;
};

function isOutputMessage(value: unknown): value is OutputMessage {
  if (typeof value !== "object" || value === null) return false;
  const status = (value as Record<string, unknown>).status;
  return status === "SENT" || status === "FAILED" || status === "PENDING";
}

/**
 * Reads the OUTPUT node's `messages` shape back out of the generic output map, or null
 * if this run predates that backend change (or isn't an OUTPUT node) — the caller falls
 * back to the raw JSON dump in that case, so an older server still renders something.
 */
function outputSummary(run: NodeRun): OutputSummary | null {
  if (run.nodeType !== "OUTPUT" || run.output === null || typeof run.output === "string") {
    return null;
  }
  const { sent, total, messages, messagesTruncated } = run.output;
  if (typeof sent !== "number" || typeof total !== "number" || !Array.isArray(messages)) {
    return null;
  }
  return {
    sent,
    total,
    messages: messages.filter(isOutputMessage),
    messagesTruncated: messagesTruncated === true,
  };
}

function MessageStatusIcon({ status }: { status: OutputMessage["status"] }) {
  switch (status) {
    case "SENT":
      return <Check className="size-3 shrink-0 text-run-success" strokeWidth={3} />;
    case "FAILED":
      return <TriangleAlert className="size-3 shrink-0 text-destructive" strokeWidth={2.5} />;
    case "PENDING":
      return <Clock className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} />;
  }
}

type OutputMessagesProps = {
  runId: number;
  nodeId: string;
  summary: OutputSummary;
  onSent: (updated: NodeRun) => void;
};

function OutputMessages({ runId, nodeId, summary, onSent }: OutputMessagesProps) {
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { sent, total, messages, messagesTruncated } = summary;

  if (messages.length === 0) {
    return (
      <p className="px-0.5 text-[11px] text-muted-foreground">
        Nothing sent — forEach resolved to an empty list.
      </p>
    );
  }

  const pendingCount = messages.filter((m) => m.status === "PENDING").length;
  const failedCount = messages.filter((m) => m.status === "FAILED").length;

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    try {
      const updated = await postRoute<NodeRun>(
        `/api/workflows/runs/${runId}/nodes/${encodeURIComponent(nodeId)}/send`,
      );
      onSent(updated);
    } catch (cause) {
      setSendError(cause instanceof RouteError ? cause.message : "Could not send those emails.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-0.5">
        <p className="text-[11px] text-muted-foreground">
          {pendingCount > 0
            ? `${pendingCount} awaiting review`
            : `${sent} sent${failedCount > 0 ? `, ${failedCount} failed` : ""}${
                total !== messages.length ? ` of ${total}` : ""
              }`}
          {messagesTruncated && " · showing first " + messages.length}
        </p>
        {pendingCount > 0 && (
          <Button
            size="sm"
            className="ml-auto h-6 gap-1 px-2 text-[11px]"
            disabled={sending}
            onClick={() => void handleSend()}
          >
            {sending ? <Spinner className="size-3" /> : <Send className="size-3" />}
            Send {pendingCount} email{pendingCount === 1 ? "" : "s"}
          </Button>
        )}
      </div>

      {sendError && (
        <p role="alert" className="px-0.5 text-[11px] text-destructive">
          {sendError}
        </p>
      )}

      <ul className="nowheel flex max-h-56 flex-col gap-1 overflow-auto">
        {messages.map((message, index) => (
          <li key={index} className="rounded-md border px-2 py-1.5 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5">
              <MessageStatusIcon status={message.status} />
              <span className="truncate font-medium text-foreground">
                {message.to ?? "(no recipient)"}
              </span>
              {message.subject && (
                <span className="ml-auto truncate pl-2 text-muted-foreground">
                  {message.subject}
                </span>
              )}
            </div>

            {message.status === "FAILED" && message.error && (
              <p className="mt-1 text-destructive">{message.error}</p>
            )}

            {message.body && (
              <p className="mt-1 line-clamp-2 text-muted-foreground">
                {message.body}
                {message.bodyTruncated && "…"}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RunPanel({ detail, error, busy, nodes, onClose, onNodeUpdated }: RunPanelProps) {
  const logged = new Map((detail?.nodes ?? []).map((run) => [run.nodeId, run]));
  const steps = nodes.filter(isStep);

  return (
    <aside aria-label="Run" className="flex h-full min-w-0 flex-col border-l bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Play className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <h2 className="truncate text-sm font-semibold tracking-tight">Run</h2>
          {detail && (
            <span className="shrink-0 rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              #{detail.runId}
            </span>
          )}
        </div>
        <Button
          aria-label="Close run panel"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {detail && (
          <p
            className={cn(
              "flex items-center gap-1.5 text-[13px] font-medium",
              STATUS_STYLE[detail.status],
            )}
          >
            <StatusIcon status={detail.status} />
            {detail.status === "PENDING"
              ? "Queued"
              : detail.status === "RUNNING"
                ? "Running"
                : detail.status === "SUCCESS"
                  ? "Finished"
                  : "Failed"}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 px-2.5 py-2 text-[12px] leading-snug text-destructive"
          >
            {error}
          </p>
        )}

        {!detail && !error && (
          <p className="px-1 text-[13px] leading-snug text-muted-foreground">
            {busy ? "Starting…" : "Nothing has run yet."}
          </p>
        )}

        {detail && (
          <ul className="flex flex-col gap-1.5">
            {steps.map((node) => {
              const run = logged.get(node.id);

              /*
               * No log row means the node was never reached. Execution stops at the
               * first failure, so everything after a failed node is absent from the
               * response rather than marked — and while the run is still going, it
               * simply hasn't got there yet.
               */
              if (!run) {
                return (
                  <li
                    key={node.id}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-2 text-[12px] text-muted-foreground"
                  >
                    <Minus className="size-3.5 shrink-0" strokeWidth={2.5} />
                    <span className="font-mono">{node.id}</span>
                    <span className="ml-auto">{busy ? "waiting" : "not reached"}</span>
                  </li>
                );
              }

              const elapsed = duration(run);
              const summary = outputSummary(run);

              return (
                <li key={node.id} className="flex flex-col gap-1.5 rounded-lg border px-2.5 py-2">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-[12px] font-medium",
                      STATUS_STYLE[run.status],
                    )}
                  >
                    <StatusIcon status={run.status} />
                    <span className="font-mono">{run.nodeId}</span>
                    <span className="truncate text-muted-foreground">{run.nodeType}</span>
                    {elapsed && (
                      <span className="ml-auto shrink-0 font-normal text-muted-foreground">
                        {elapsed}
                      </span>
                    )}
                  </div>

                  {run.errorMessage && (
                    <pre className="nowheel max-h-40 overflow-auto rounded-md bg-destructive/5 px-2 py-1.5 text-[11px] leading-relaxed whitespace-pre-wrap text-destructive">
                      {run.errorMessage}
                    </pre>
                  )}

                  {run.output !== null && summary && detail && (
                    <OutputMessages
                      runId={detail.runId}
                      nodeId={run.nodeId}
                      summary={summary}
                      onSent={onNodeUpdated}
                    />
                  )}

                  {run.output !== null && !summary && (
                    <pre className="nowheel max-h-40 overflow-auto rounded-md bg-muted/50 px-2 py-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {typeof run.output === "string"
                        ? run.output
                        : JSON.stringify(run.output, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
