"use client";

import { useState } from "react";
import { Check, CircleSlash, Clock, Minus, Send, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNodeRun } from "@/components/workflow/run-status";
import { RouteError, postRoute } from "@/lib/api/route-client";
import { asInstant, type NodeRun, type NodeRunStatus } from "@/types/run.types";
import { cn } from "@/lib/utils";

/*
 * One node's slice of the last run — status, timing, error and output — shown
 * inside that node's own tab instead of a separate scrolling list. Reads run
 * state from `RunStatusContext` (the same source a node card's badge reads),
 * so this needs nothing from its caller except which node and how to send a
 * held-for-review email.
 */

const STATUS_STYLE: Record<NodeRunStatus, string> = {
  SUCCESS: "text-run-success",
  FAILED: "text-destructive",
  RUNNING: "text-brand",
  PENDING: "text-muted-foreground",
  SKIPPED: "text-muted-foreground",
};

const STATUS_LABEL: Record<NodeRunStatus, string> = {
  SUCCESS: "Succeeded",
  FAILED: "Failed",
  RUNNING: "Running",
  PENDING: "Queued",
  SKIPPED: "Skipped",
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

/** Rows a DATA_SOURCE node produces — always `Map.of("rows", rows)` on the wire. */
type DatasourceRows = Record<string, unknown>[];

const DATASOURCE_PREVIEW_ROWS = 8;

/**
 * Reads a DATA_SOURCE node's `rows` back out of the generic output map, or null if
 * this isn't one (or the shape doesn't match) — the caller falls back to the raw
 * JSON dump in that case.
 */
function datasourceRows(run: NodeRun): DatasourceRows | null {
  if (run.nodeType !== "DATA_SOURCE" || run.output === null || typeof run.output === "string") {
    return null;
  }
  const { rows } = run.output;
  return Array.isArray(rows) ? (rows as DatasourceRows) : null;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function DatasourceTable({ rows }: { rows: DatasourceRows }) {
  if (rows.length === 0) {
    return <p className="px-1 text-[11px] text-muted-foreground">No rows.</p>;
  }

  const columns = Object.keys(rows[0]);
  const visible = rows.slice(0, DATASOURCE_PREVIEW_ROWS);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="nowheel max-h-64 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="h-8 text-[11px]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column} className="max-w-40 truncate p-2 text-[11px]">
                    {cellText(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > visible.length && (
        <p className="px-1 text-[11px] text-muted-foreground">
          Showing {visible.length} of {rows.length} rows.
        </p>
      )}
    </div>
  );
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

type NodeResultProps = {
  nodeId: string;
  /** Null until a run has been started at least once this session. */
  runId: number | null;
  /** Patches a node's row after the manual-review "Send" action settles its messages. */
  onNodeUpdated: (updated: NodeRun) => void;
};

/** This node's place in the last run — status, timing, error and output. */
export function NodeResult({ nodeId, runId, onNodeUpdated }: NodeResultProps) {
  const state = useNodeRun(nodeId);

  if (!state) {
    return (
      <p className="px-1 text-[13px] leading-snug text-muted-foreground">Nothing has run yet.</p>
    );
  }

  if (state.kind === "waiting") {
    return (
      <p className="flex items-center gap-1.5 px-1 text-[13px] leading-snug text-muted-foreground">
        <Spinner className="size-3.5" />
        Waiting for this step…
      </p>
    );
  }

  if (state.kind === "notReached") {
    return (
      <p className="flex items-center gap-1.5 px-1 text-[13px] leading-snug text-muted-foreground">
        <Minus className="size-3.5" strokeWidth={2.5} />
        Not reached — the run stopped at an earlier failure.
      </p>
    );
  }

  const { run } = state;
  const elapsed = duration(run);
  const summary = outputSummary(run);
  const rows = datasourceRows(run);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex items-center gap-1.5 text-[12px] font-medium",
          STATUS_STYLE[run.status],
        )}
      >
        <StatusIcon status={run.status} />
        <span>{STATUS_LABEL[run.status]}</span>
        {elapsed && (
          <span className="ml-auto shrink-0 font-normal text-muted-foreground">{elapsed}</span>
        )}
      </div>

      {run.errorMessage && (
        <pre className="nowheel max-h-40 overflow-auto rounded-md bg-destructive/5 px-2 py-1.5 text-[11px] leading-relaxed whitespace-pre-wrap text-destructive">
          {run.errorMessage}
        </pre>
      )}

      {rows && <DatasourceTable rows={rows} />}

      {!rows && run.output !== null && summary && runId !== null && (
        <OutputMessages
          runId={runId}
          nodeId={run.nodeId}
          summary={summary}
          onSent={onNodeUpdated}
        />
      )}

      {!rows && run.output !== null && !summary && (
        <pre className="nowheel max-h-40 overflow-auto rounded-md bg-muted/50 px-2 py-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {typeof run.output === "string" ? run.output : JSON.stringify(run.output, null, 2)}
        </pre>
      )}
    </div>
  );
}
