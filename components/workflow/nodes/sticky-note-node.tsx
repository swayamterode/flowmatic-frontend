"use client";

import { memo, useEffect, useRef, useState } from "react";
import { NodeResizer, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Check, Ellipsis, Palette, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NodeActionBar } from "@/components/workflow/node-action-bar";
import { StickyNoteMarkdown } from "@/components/workflow/nodes/sticky-note-markdown";
import {
  DEFAULT_NOTE_COLOR,
  NOTE_COLORS,
  type NoteColor,
} from "@/components/workflow/sticky-note-colors";
import { cn } from "@/lib/utils";

// A `type`, not an interface: React Flow's node data must satisfy
// Record<string, unknown>, and only type aliases get an implicit index signature.
export type StickyNoteData = {
  content: string;
  color?: NoteColor;
  onMoreOptions?: (nodeId: string) => void;
};

export type StickyNoteNodeType = Node<StickyNoteData, "stickyNote">;

export const STICKY_NOTE_DEFAULT_SIZE = { width: 280, height: 100 };
export const STICKY_NOTE_MIN_SIZE = { width: 160, height: 100 };

export const STICKY_NOTE_PLACEHOLDER =
  "## Workflow Note\n\n**Double click** to add context for this workflow (supports Markdown!).";

function StickyNoteNodeComponent({ id, data, selected }: NodeProps<StickyNoteNodeType>) {
  const { updateNodeData, deleteElements } = useReactFlow();

  const [editing, setEditing] = useState(false);
  /*
   * The draft only exists for the duration of an edit — seeded when editing
   * starts, flushed to node data when it ends. Keeping every keystroke out of
   * node data means typing doesn't re-render the rest of the canvas.
   */
  const [draft, setDraft] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const color = data.color ?? DEFAULT_NOTE_COLOR;

  useEffect(() => {
    if (!editing) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    // Caret at the end, so editing continues where the note left off.
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [editing]);

  const startEditing = () => {
    setDraft(data.content);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== data.content) updateNodeData(id, { content: draft });
  };

  return (
    <div className="group relative size-full">
      <NodeResizer
        isVisible={selected}
        minWidth={STICKY_NOTE_MIN_SIZE.width}
        minHeight={STICKY_NOTE_MIN_SIZE.height}
        lineClassName="!border-brand/40"
        handleClassName="!size-2 !rounded-[2px] !border-brand !bg-background"
      />

      <NodeActionBar forceVisible={paletteOpen || selected}>
        <Popover open={paletteOpen} onOpenChange={setPaletteOpen}>
          <PopoverTrigger
            render={
              <Button
                aria-label="Change note color"
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            <Palette />
          </PopoverTrigger>
          <PopoverContent align="center" className="w-auto flex-row gap-1 p-1.5" side="top">
            {NOTE_COLORS.map(({ key, label }) => (
              <button
                key={key}
                aria-label={label}
                aria-pressed={key === color}
                data-note-color={key}
                type="button"
                className={cn(
                  "note-swatch flex size-6 items-center justify-center rounded-md border transition-transform",
                  "hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  key === color && "ring-2 ring-ring/60",
                )}
                onClick={() => {
                  updateNodeData(id, { color: key });
                  setPaletteOpen(false);
                }}
              >
                {key === color ? <Check className="size-3.5 text-(--note-ink)" /> : null}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Button
          aria-label="More options"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => data.onMoreOptions?.(id)}
        >
          <Ellipsis />
        </Button>

        <Button
          aria-label="Delete note"
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
          "sticky-note size-full overflow-hidden rounded-xl border-2 text-sm shadow-xs transition-shadow",
          selected && "shadow-md",
        )}
        data-note-color={color}
        onDoubleClick={startEditing}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            className="nodrag nowheel size-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none"
            value={draft}
            onBlur={commit}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                commit();
              }
            }}
          />
        ) : (
          <div className="nowheel size-full overflow-auto p-4 wrap-break-word">
            {data.content.trim() ? (
              <StickyNoteMarkdown content={data.content} />
            ) : (
              <p className="opacity-60">Double click to edit…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const StickyNoteNode = memo(StickyNoteNodeComponent);
