"use client";

import { useCallback, useId, useMemo, useRef } from "react";
import { useEdges, useNodes, useNodesData, useReactFlow } from "@xyflow/react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_OUTPUT_TYPES,
  nextOutputName,
  outputNameProblem,
  type AiOutputField,
  type AiOutputType,
} from "@/components/workflow/ai-fields";
import { InsertMenu, useTokenField } from "@/components/workflow/insert-menu";
import { SECTION_LABEL } from "@/components/workflow/node-editor-shell";
import type { AiNodeType } from "@/components/workflow/nodes/ai-node";
import type { WorkflowNode } from "@/components/workflow/types";
import { upstreamFields } from "@/components/workflow/upstream-fields";
import {
  PromptTooLong,
  RefinedNotice,
  RefinePromptButton,
  RefiningPrompt,
} from "@/features/prompt-refine/refine-controls";
import { MESSAGE_MAX_CHARS } from "@/features/prompt-refine/types";
import { useRefinePrompt } from "@/features/prompt-refine/use-refine-prompt";
import { cn } from "@/lib/utils";

/*
 * The AI node's fields: prompt and output schema. Rendered inside the shared
 * tab shell by `node-tab-content.tsx`, which also appends this node's run
 * result below — see that file for why the two live in one tab.
 *
 * Every edit writes straight through `updateNodeData` — the panel keeps no draft.
 * That is the opposite of the sticky note, which buffers one, and the difference is
 * deliberate: a note's textarea lives *inside* a node, where each keystroke would
 * re-render it, while this panel sits outside the React Flow subtree. More
 * importantly, ⌘S can fire while the caret is still in the prompt. A draft waiting
 * on blur would let that save write the previous prompt, so there is nothing here
 * that is on screen but not yet in the graph.
 */

type AiNodeFieldsProps = {
  nodeId: string;
};

export function AiNodeFields({ nodeId }: AiNodeFieldsProps) {
  const { updateNodeData } = useReactFlow<WorkflowNode>();

  const node = useNodesData<AiNodeType>(nodeId);
  const nodes = useNodes<WorkflowNode>();
  const edges = useEdges();

  const promptId = useId();
  const groups = useMemo(() => upstreamFields(nodes, edges, nodeId), [nodes, edges, nodeId]);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const prompt = node?.data.prompt ?? "";
  // One memoized writer, shared by the token picker and the refiner, so neither
  // rebuilds its callbacks on every keystroke.
  const setPrompt = useCallback(
    (next: string) => updateNodeData(nodeId, { prompt: next }),
    [nodeId, updateNodeData],
  );

  const promptField = useTokenField(promptRef, prompt, setPrompt);
  const refine = useRefinePrompt(prompt, setPrompt);

  /*
   * Measured on the trimmed prompt because that is what the handler sends, so the
   * wand and the endpoint agree on exactly where the limit falls.
   */
  const promptLength = prompt.trim().length;
  const tooLongToRefine = promptLength > MESSAGE_MAX_CHARS;

  // The canvas stops rendering this tab when its node goes, but a render can
  // still slip through in between.
  if (!node) return null;

  const { output } = node.data;
  const setOutput = (next: AiOutputField[]) => updateNodeData(nodeId, { output: next });

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className={SECTION_LABEL} htmlFor={promptId}>
            Prompt
          </label>

          <div className="flex items-center gap-0.5">
            <InsertMenu
              fieldLabel="the prompt"
              finalFocus={promptRef}
              groups={groups}
              onInsert={promptField.insert}
            />
            {refine.refinement && (
              <RefinedNotice refinement={refine.refinement} onUndo={refine.undo} />
            )}
            <RefinePromptButton
              busy={refine.busy}
              unavailable={promptLength === 0 || tooLongToRefine}
              onRefine={refine.refine}
            />
          </div>
        </div>

        <div className="relative">
          <Textarea
            id={promptId}
            ref={promptRef}
            aria-busy={refine.busy}
            autoFocus
            className={cn(
              "max-h-96 min-h-40 text-[13px] leading-relaxed",
              refine.busy && "text-transparent caret-transparent select-none",
            )}
            placeholder="Describe what the model should do, and reference upstream data with Insert."
            readOnly={refine.busy}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onFocus={promptField.onFocus}
          />
          {refine.busy && <RefiningPrompt text={prompt} />}
        </div>

        {tooLongToRefine && <PromptTooLong length={promptLength} />}

        <p className="px-1 text-[11px] leading-snug text-muted-foreground">
          {groups.length === 0
            ? "Connect a node upstream to reference its data."
            : `Available: ${groups.flatMap((group) => group.refs.map((ref) => ref.token)).join("  ")}`}
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className={SECTION_LABEL}>Outputs</h3>
          <Button
            className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            size="sm"
            variant="ghost"
            onClick={() => setOutput([...output, { name: nextOutputName(output), type: "string" }])}
          >
            <Plus className="size-3.5" />
            Add field
          </Button>
        </div>

        {output.length === 0 ? (
          <p className="px-1 text-[11px] leading-snug text-muted-foreground">
            No fields yet. The whole model response will arrive as{" "}
            <span className="font-mono">{`{{${nodeId}.text}}`}</span>.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {output.map((field, index) => {
              /*
               * Keyed by position, not by name: a name is free to be blank or to
               * collide while it is being typed, so it can't identify a row. No row
               * holds state of its own, so a remount on removal costs nothing.
               */
              const problem = outputNameProblem(
                field.name,
                output.filter((_, other) => other !== index).map((other) => other.name),
              );

              const replace = (patch: Partial<AiOutputField>) =>
                setOutput(
                  output.map((existing, other) =>
                    other === index ? { ...existing, ...patch } : existing,
                  ),
                );

              return (
                <li key={index}>
                  <div className="flex items-center gap-1.5">
                    <Input
                      aria-invalid={problem !== null}
                      aria-label={`Output field ${index + 1} name`}
                      className="h-8 font-mono text-[13px]"
                      placeholder="fieldName"
                      spellCheck={false}
                      value={field.name}
                      onChange={(event) => replace({ name: event.target.value })}
                    />
                    <NativeSelect
                      aria-label={`Output field ${index + 1} type`}
                      className="w-28 shrink-0"
                      size="sm"
                      value={field.type}
                      onChange={(event) => replace({ type: event.target.value as AiOutputType })}
                    >
                      {AI_OUTPUT_TYPES.map((type) => (
                        <NativeSelectOption key={type} value={type}>
                          {type}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <Button
                      aria-label={`Remove ${field.name || `output field ${index + 1}`}`}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setOutput(output.filter((_, other) => other !== index))}
                    >
                      <X />
                    </Button>
                  </div>
                  {problem && (
                    <p role="alert" className="mt-1 px-1 text-[11px] leading-snug text-destructive">
                      {problem}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="px-1 text-[11px] leading-snug text-muted-foreground">
          Downstream nodes read these as <span className="font-mono">{`{{${nodeId}.field}}`}</span>.
        </p>
      </section>
    </>
  );
}
