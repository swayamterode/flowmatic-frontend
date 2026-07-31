"use client";

import { memo } from "react";
import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Eye, Mail, Repeat, SlidersHorizontal, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { emailProblem, isPerItem, type EmailData } from "@/components/workflow/email-fields";
import { useRequestEditor } from "@/components/workflow/editor-target";
import { NodeActionBar } from "@/components/workflow/node-action-bar";
import { NodeRunBadge, RUN_TONE_CARD, useRunTone } from "@/components/workflow/run-status";
import { cn } from "@/lib/utils";

export type EmailNodeType = Node<EmailData, "email">;

export const EMAIL_WIDTH = 300;

/*
 * Height is an estimate used only to centre the node when it is placed — the card
 * grows with its config, so nothing pins it.
 */
export const EMAIL_DEFAULT_SIZE = { width: EMAIL_WIDTH, height: 150 };

function EmailNodeComponent({ id, data, selected }: NodeProps<EmailNodeType>) {
  const { deleteElements } = useReactFlow();
  const requestEditor = useRequestEditor();
  const tone = useRunTone(id);

  const configured = data.to.trim() || data.body.trim();
  const problem = emailProblem(data);
  const perItem = isPerItem(data);

  return (
    <div className="group relative w-full">
      <NodeActionBar forceVisible={selected}>
        <Button
          aria-label="Configure email node"
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
          // Last, so the run's border wins over hover and selection alike.
          RUN_TONE_CARD[tone],
        )}
        onDoubleClick={(event) => {
          event.stopPropagation();
          requestEditor(id);
        }}
      >
        <header className="flex h-9 items-center gap-2 border-b px-3">
          <Mail className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <h3 className="truncate text-[13px] font-medium tracking-tight">Email</h3>
          <NodeRunBadge nodeId={id} />
        </header>

        <div className="flex flex-col gap-2 p-3">
          {configured ? (
            <>
              {/*
               * The mode first, because it is what changes the meaning of every
               * field under it — `{{item.*}}` only resolves in one of them.
               */}
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {perItem ? (
                  <Repeat className="size-3 shrink-0" strokeWidth={2} />
                ) : (
                  <User className="size-3 shrink-0" strokeWidth={2} />
                )}
                {perItem ? "One email per item" : "A single email"}
              </p>

              {data.sendMode === "manual" && (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Eye className="size-3 shrink-0" strokeWidth={2} />
                  Held for review before sending
                </p>
              )}

              <dl className="flex flex-col gap-1 text-[13px] leading-snug">
                <div className="flex min-w-0 gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">To</dt>
                  <dd className="min-w-0 truncate font-mono text-[12px]">{data.to || "—"}</dd>
                </div>
                {data.subject.trim() && (
                  <div className="flex min-w-0 gap-1.5">
                    <dt className="shrink-0 text-muted-foreground">Re</dt>
                    <dd className="min-w-0 truncate">{data.subject}</dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-input px-3 py-5 text-center">
              <Mail className="size-5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[13px] leading-snug text-muted-foreground">Not configured</p>
              <Button
                className="nodrag nopan"
                size="sm"
                variant="outline"
                onClick={() => requestEditor(id)}
              >
                Set up email
              </Button>
            </div>
          )}

          {configured && problem && (
            <p className="text-[11px] leading-snug text-destructive">{problem}</p>
          )}
        </div>
      </div>

      {/* No source handle: an email is where a chain ends, so there is no tail to grow. */}
      <Handle
        type="target"
        position={Position.Left}
        className="size-2.5 border-2 border-muted-foreground/45 bg-background transition-colors hover:border-brand"
      />
    </div>
  );
}

export const EmailNode = memo(EmailNodeComponent);
