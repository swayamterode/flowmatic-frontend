"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_WORKFLOW_NAME, type SaveStatus } from "@/components/workflow/use-workflow-save";
import { cn } from "@/lib/utils";

type WorkflowTitleProps = {
  name: string;
  status: SaveStatus;
  error: string | null;
  lastSavedAt: Date | null;
  onRename: (name: string) => void;
  onSave: () => void;
};

export function WorkflowTitle({
  name,
  status,
  error,
  lastSavedAt,
  onRename,
  onSave,
}: WorkflowTitleProps) {
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useSaveErrorToast(status, error);

  const commit = () => {
    const next = draft.trim() || DEFAULT_WORKFLOW_NAME;
    setDraft(next);
    if (next !== name) onRename(next);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border bg-card p-1 shadow-xs",
        "supports-backdrop-filter:bg-card/80 supports-backdrop-filter:backdrop-blur-sm",
        status === "error" && "border-destructive/40",
      )}
    >
      <Input
        ref={inputRef}
        aria-label="Workflow name"
        className={cn(
          "nodrag no-pan field-sizing-content h-7 w-auto max-w-64 min-w-fit border-transparent bg-transparent px-2 text-[13px] font-medium tracking-tight shadow-none",
          "hover:bg-accent dark:bg-transparent",
        )}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            inputRef.current?.blur();
          }
          if (event.key === "Escape") setDraft(name);
        }}
      />

      <span aria-hidden className="h-4 w-px shrink-0 bg-border" />

      <SaveState status={status} lastSavedAt={lastSavedAt} />
      {status === "unsaved" && (
        <Button
          className="nodrag no-pan bg-brand text-brand-foreground hover:bg-brand/90"
          size="sm"
          onClick={onSave}
        >
          Save
        </Button>
      )}

      {status === "error" && (
        <Button className="nodrag no-pan" size="sm" variant="destructive" onClick={onSave}>
          <RotateCcw />
          Retry
        </Button>
      )}
    </div>
  );
}

const STATUS_SLOT = "flex min-w-fit items-center gap-1.5 px-1 text-[11px] text-muted-foreground";

function SaveState({ status, lastSavedAt }: Pick<WorkflowTitleProps, "status" | "lastSavedAt">) {
  if (status === "unsaved") return null;

  if (status === "error") {
    return (
      <p role="alert" className={cn(STATUS_SLOT, "text-destructive")}>
        <Dot className="bg-destructive" />
        {/* The reason arrives by toast; the pill only reports that it happened. */}
        Couldn&apos;t save
      </p>
    );
  }

  if (status === "saving") {
    return (
      <p className={STATUS_SLOT}>
        <Spinner className="size-3" />
        Saving…
      </p>
    );
  }

  if (status === "dirty") {
    return (
      <p className={STATUS_SLOT}>
        <Dot className="bg-brand" />
        Unsaved changes
      </p>
    );
  }

  if (!lastSavedAt) {
    return (
      <p className={STATUS_SLOT}>
        <Dot className="bg-muted-foreground/55" />
        Saved
      </p>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<p className={STATUS_SLOT} />}>
        <Dot className="bg-muted-foreground/55" />
        Saved
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Last saved at {lastSavedAt.toLocaleTimeString()}
      </TooltipContent>
    </Tooltip>
  );
}

function Dot({ className }: { className: string }) {
  return <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", className)} />;
}

function useSaveErrorToast(status: SaveStatus, error: string | null) {
  const toasted = useRef<string | null>(null);

  useEffect(() => {
    if (status === "error") {
      const message = error ?? "Could not save.";
      if (toasted.current === message) return;
      toasted.current = message;
      toast.error(message);
      return;
    }

    if (status === "saved") toasted.current = null;
  }, [status, error]);
}
