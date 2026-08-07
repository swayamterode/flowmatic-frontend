"use client";

import { X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/*
 * The frame every tab in the slide-out panel sits in: header, scrolling body,
 * optional footer note. One shell for a node's own tab, the Run tab and the
 * catalog tab alike, so they can't disagree about how a panel looks.
 */

export const SECTION_LABEL =
  "px-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase";

type NodeEditorShellProps = {
  title: string;
  /** A short tag next to the title — a node's id, a run's number, or nothing at all. */
  badge?: React.ReactNode;
  Icon: LucideIcon;
  onClose: () => void;
  children: React.ReactNode;
  /** A muted line under the fields, for what the server decides rather than the user. */
  footer?: React.ReactNode;
};

export function NodeEditorShell({
  title,
  badge,
  Icon,
  onClose,
  children,
  footer,
}: NodeEditorShellProps) {
  return (
    <aside
      aria-label={`${title} settings`}
      className="flex h-full min-w-0 flex-col border-l bg-background"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        /*
         * Handled here because the canvas's global shortcut ignores Escape raised
         * from a field, and every control in these panels is one. stopPropagation
         * keeps the canvas from also reacting.
         */
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
          {badge && (
            <span className="shrink-0 rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <Button
          aria-label={`Close ${title}`}
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">{children}</div>

      {footer && (
        <footer className="shrink-0 border-t px-4 py-2.5 text-[11px] leading-snug text-muted-foreground">
          {footer}
        </footer>
      )}
    </aside>
  );
}
