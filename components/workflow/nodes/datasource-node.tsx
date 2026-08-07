"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Database, FileSpreadsheet, Trash2, Upload, X } from "lucide-react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { NodeActionBar } from "@/components/workflow/node-action-bar";
import { NodeAddTail } from "@/components/workflow/node-add-tail";
import {
  CSV_ACCEPT,
  CSV_MAX_LABEL,
  formatBytes,
  readCsvPreview,
  validateCsvFile,
} from "@/components/workflow/csv-preview";
import { NodeRunBadge, RUN_TONE_CARD, useRunTone } from "@/components/workflow/run-status";
import { RouteError, postFormRoute } from "@/lib/api/route-client";
import type { UploadResponse } from "@/types/upload.types";
import { cn } from "@/lib/utils";

export type DatasourceData = {
  file?: DatasourceFile;
};

export type DatasourceFile = {
  uploadId: string;
  name: string;
  size: number;
  columns: string[];
  rowCount: number;
};

export type DatasourceNodeType = Node<DatasourceData, "datasource">;

export const DATASOURCE_WIDTH = 300;
export const DATASOURCE_DEFAULT_SIZE = { width: DATASOURCE_WIDTH, height: 190 };

const VISIBLE_COLUMNS = 4;

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function isFileDrag(event: React.DragEvent) {
  return event.dataTransfer.types.includes("Files");
}

function DatasourceNodeComponent({ id, data, selected }: NodeProps<DatasourceNodeType>) {
  const { deleteElements, updateNodeData } = useReactFlow();
  const tone = useRunTone(id);

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempt = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const { file } = data;

  const acceptFile = useCallback(
    async (candidate: File) => {
      const problem = validateCsvFile(candidate);
      if (problem) {
        setError(problem);
        return;
      }

      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      const ticket = (attempt.current += 1);

      setError(null);
      setBusy(true);

      const form = new FormData();
      form.append("file", candidate, candidate.name);

      try {
        const [preview, upload] = await Promise.all([
          readCsvPreview(candidate),
          postFormRoute<UploadResponse>("/api/uploads", form, controller.signal),
        ]);

        if (ticket !== attempt.current) return;
        updateNodeData(id, {
          file: {
            uploadId: upload.uploadId,
            name: candidate.name,
            size: candidate.size,
            ...preview,
          },
        });
      } catch (cause) {
        if (ticket !== attempt.current || controller.signal.aborted) return;
        setError(
          cause instanceof RouteError || cause instanceof Error
            ? cause.message
            : "That file could not be uploaded.",
        );
      } finally {
        if (ticket === attempt.current) setBusy(false);
      }
    },
    [id, updateNodeData],
  );

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (!isFileDrag(event)) return;
    dragDepth.current += 1;
    setDragging(true);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (!isFileDrag(event)) return;
    // Claim the drag here so the canvas's own handler leaves it alone.
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (!isFileDrag(event)) return;
    dragDepth.current -= 1;
    if (dragDepth.current > 0) return;
    dragDepth.current = 0;
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (!isFileDrag(event)) return;
      // Without preventDefault the browser navigates the tab to the dropped
      // file, taking the unsaved workflow with it.
      event.preventDefault();
      event.stopPropagation();
      dragDepth.current = 0;
      setDragging(false);

      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;
      if (files.length > 1) {
        setError("Drop one CSV at a time.");
        return;
      }
      void acceptFile(files[0]);
    },
    [acceptFile],
  );

  return (
    <div className="group relative w-full">
      <NodeActionBar forceVisible={selected}>
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
          /*
           * The drag wins outright, rather than being layered over the tone: a drop
           * target has to confirm it will take the file whatever the last run did.
           * Swapping the two instead of relying on order keeps it decided here, not
           * in the cascade — `group-hover:` variants in the tone map would otherwise
           * outrank this plain border for as long as the pointer sat on the card.
           */
          dragging ? "border-brand/60" : RUN_TONE_CARD[tone],
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <header className="flex h-9 items-center gap-2 border-b px-3">
          <Database className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <h3 className="truncate text-[13px] font-medium tracking-tight">Datasource</h3>
          <NodeRunBadge nodeId={id} />
        </header>

        <div className="flex flex-col gap-2 p-3">
          {file ? (
            <>
              <Attachment className="w-full" size="sm">
                <AttachmentMedia>
                  <FileSpreadsheet />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{file.name}</AttachmentTitle>
                  <AttachmentDescription>{formatBytes(file.size)}</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label={`Remove ${file.name}`}
                    className="nodrag no-pan text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      attempt.current += 1;
                      inFlight.current?.abort();
                      setBusy(false);
                      setError(null);
                      updateNodeData(id, { file: undefined });
                    }}
                  >
                    <X />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>

              <p className="text-[11px] text-muted-foreground">
                {plural(file.columns.length, "column")} · {plural(file.rowCount, "row")}
              </p>

              <ul className="nowheel flex max-h-16 flex-wrap gap-1 overflow-y-auto">
                {file.columns.slice(0, VISIBLE_COLUMNS).map((column, index) => (
                  <li
                    key={`${column}-${index}`}
                    className="max-w-full truncate rounded-md border bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {column || "—"}
                  </li>
                ))}
                {file.columns.length > VISIBLE_COLUMNS && (
                  <li className="rounded-md border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    +{file.columns.length - VISIBLE_COLUMNS}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <div
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border border-dashed border-input px-3 py-5 text-center transition-colors",
                dragging && "border-brand/60 bg-accent",
              )}
            >
              <Upload
                className={cn(
                  "size-5 text-muted-foreground transition-colors",
                  dragging && "text-brand",
                )}
                strokeWidth={1.5}
              />
              <p className="text-[13px] leading-snug text-muted-foreground">Drop CSV here or</p>
              <Button
                className="nodrag no-pan"
                disabled={busy}
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Choose file
              </Button>
              <p className="text-[11px] text-muted-foreground">Only .csv · up to {CSV_MAX_LABEL}</p>
            </div>
          )}

          {busy && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Spinner className="size-3" />
              Uploading…
            </p>
          )}

          {error && (
            <p role="alert" className="text-[11px] leading-snug text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        accept={CSV_ACCEPT}
        className="hidden"
        tabIndex={-1}
        type="file"
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = "";
          if (chosen) void acceptFile(chosen);
        }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="size-2.5 border-2 border-muted-foreground/45 bg-background transition-colors hover:border-brand"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="size-2.5 border-2 border-muted-foreground/45 bg-background transition-colors hover:border-brand"
      />

      <NodeAddTail nodeId={id} />
    </div>
  );
}

export const DatasourceNode = memo(DatasourceNodeComponent);
