"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useEdges, useNodes, useNodesData, useReactFlow } from "@xyflow/react";
import { Eye, Repeat, Send, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  EMAIL_DEFAULT_SUBJECT,
  forEachProblem,
  isPerItem,
  requiredFieldProblem,
  type EmailData,
} from "@/components/workflow/email-fields";
import { InsertMenu, useTokenField } from "@/components/workflow/insert-menu";
import { SECTION_LABEL } from "@/components/workflow/node-editor-shell";
import type { EmailNodeType } from "@/components/workflow/nodes/email-node";
import type { WorkflowNode } from "@/components/workflow/types";
import { itemFields, upstreamFields } from "@/components/workflow/upstream-fields";

/*
 * The email node's fields. Rendered inside the shared tab shell by
 * `node-tab-content.tsx`, which also appends this node's run result below.
 * Writes straight through `updateNodeData`, with no draft — see the note in
 * `ai-node-editor.tsx` for why.
 */

type EmailNodeFieldsProps = {
  nodeId: string;
};

export function EmailNodeFields({ nodeId }: EmailNodeFieldsProps) {
  const { updateNodeData } = useReactFlow<WorkflowNode>();

  const node = useNodesData<EmailNodeType>(nodeId);
  const nodes = useNodes<WorkflowNode>();
  const edges = useEdges();

  const forEachId = useId();
  const toId = useId();
  const subjectId = useId();
  const bodyId = useId();

  const data = node?.data;

  /*
   * Which mode the panel is showing. Local, not derived from `forEach` on every
   * render, because switching to per-item leaves the source blank for a moment and a
   * derived mode would snap straight back to single as the user reached for the
   * field. Seeded from the stored value, so reopening a per-item node lands in
   * per-item mode.
   */
  const [perItem, setPerItem] = useState(() => (data ? isPerItem(data) : false));

  /*
   * Which required fields have been visited, so a node nobody has configured yet
   * doesn't open covered in red. `to` and `body` are empty on every new node, and
   * telling somebody they got it wrong before they have typed anything is just noise.
   *
   * A node that already holds config counts as visited throughout: reopening a
   * half-finished node *should* point at what is still missing.
   */
  const [touched, setTouched] = useState<Partial<Record<"to" | "body", boolean>>>(() =>
    data && (data.to.trim() || data.body.trim() || data.subject.trim() || data.forEach.trim())
      ? { to: true, body: true }
      : {},
  );

  const markTouched = (field: "to" | "body") =>
    setTouched((current) => ({ ...current, [field]: true }));

  const upstream = useMemo(() => upstreamFields(nodes, edges, nodeId), [nodes, edges, nodeId]);
  const item = useMemo(() => itemFields(nodes, edges, nodeId), [nodes, edges, nodeId]);

  /*
   * `{{item.*}}` is offered only in per-item mode, and that is not cosmetic: the
   * executor puts `item` in scope per element, so referencing it in single mode is a
   * guaranteed run-time failure.
   */
  const templateGroups = useMemo(
    () => (perItem && item ? [item, ...upstream] : upstream),
    [item, perItem, upstream],
  );

  const set = (patch: Partial<EmailData>) => updateNodeData(nodeId, patch);

  const forEachRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const forEachField = useTokenField(forEachRef, data?.forEach ?? "", (next) =>
    set({ forEach: next }),
  );
  const toField = useTokenField(toRef, data?.to ?? "", (next) => set({ to: next }));
  const subjectField = useTokenField(subjectRef, data?.subject ?? "", (next) =>
    set({ subject: next }),
  );
  const bodyField = useTokenField(bodyRef, data?.body ?? "", (next) => set({ body: next }));

  // The canvas stops rendering this tab when its node goes, but a render can
  // still slip through in between.
  if (!data) return null;

  /*
   * A malformed `forEach` needs no gate: it is only ever non-null for a non-blank
   * value, so the user has necessarily typed something. The two required fields do,
   * because blank is their starting state.
   */
  const forEachIssue = forEachProblem(data.forEach);
  const toIssue = touched.to ? requiredFieldProblem("to", data.to) : null;
  const bodyIssue = touched.body ? requiredFieldProblem("body", data.body) : null;

  return (
    <>
      <section className="flex flex-col gap-1.5">
        <h3 className={SECTION_LABEL}>Send</h3>
        <ToggleGroup
          className="w-full"
          value={[perItem ? "each" : "one"]}
          onValueChange={(value) => {
            const next = value[0] === "each";
            setPerItem(next);
            // Leaving per-item mode clears the source, so what is stored always
            // matches what will happen at run time.
            if (!next) set({ forEach: "" });
          }}
        >
          <ToggleGroupItem className="flex-1 text-[13px]" value="one">
            <User data-icon="inline-start" className="size-3.5" />A single email
          </ToggleGroupItem>
          <ToggleGroupItem className="flex-1 text-[13px]" value="each">
            <Repeat data-icon="inline-start" className="size-3.5" />
            One per item
          </ToggleGroupItem>
        </ToggleGroup>

        {perItem && (
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className={SECTION_LABEL} htmlFor={forEachId}>
                For each
              </label>
              <InsertMenu
                fieldLabel="the list to iterate"
                finalFocus={forEachRef}
                groups={upstream}
                onInsert={forEachField.insert}
              />
            </div>
            <Input
              id={forEachId}
              ref={forEachRef}
              aria-invalid={forEachIssue !== null}
              className="h-8 font-mono text-[13px]"
              placeholder="{{ds.rows}}"
              spellCheck={false}
              value={data.forEach}
              onChange={(event) => set({ forEach: event.target.value })}
              onFocus={forEachField.onFocus}
            />
            {forEachIssue ? (
              <p role="alert" className="px-1 text-[11px] leading-snug text-destructive">
                {forEachIssue}
              </p>
            ) : (
              <p className="px-1 text-[11px] leading-snug text-muted-foreground">
                One email per element, with that element available as{" "}
                <span className="font-mono">{"{{item.…}}"}</span>.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className={SECTION_LABEL}>Delivery</h3>
        <ToggleGroup
          className="w-full"
          value={[data.sendMode]}
          onValueChange={(value) => set({ sendMode: value[0] === "manual" ? "manual" : "auto" })}
        >
          <ToggleGroupItem className="flex-1 text-[13px]" value="auto">
            <Send data-icon="inline-start" className="size-3.5" />
            Send automatically
          </ToggleGroupItem>
          <ToggleGroupItem className="flex-1 text-[13px]" value="manual">
            <Eye data-icon="inline-start" className="size-3.5" />
            Hold for review
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="px-1 text-[11px] leading-snug text-muted-foreground">
          {data.sendMode === "manual"
            ? "Nothing sends until you approve it here, in this node's Result section, once the run finishes."
            : "Sends as soon as this node runs."}
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className={SECTION_LABEL} htmlFor={toId}>
            To
          </label>
          <InsertMenu
            fieldLabel="the recipient"
            finalFocus={toRef}
            groups={templateGroups}
            onInsert={toField.insert}
          />
        </div>
        <Input
          id={toId}
          ref={toRef}
          autoFocus
          aria-invalid={toIssue !== null}
          className="h-8 font-mono text-[13px]"
          placeholder={perItem ? "{{item.email}}" : "someone@example.com"}
          spellCheck={false}
          value={data.to}
          onBlur={() => markTouched("to")}
          onChange={(event) => set({ to: event.target.value })}
          onFocus={toField.onFocus}
        />
        {toIssue && (
          <p role="alert" className="px-1 text-[11px] leading-snug text-destructive">
            {toIssue}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className={SECTION_LABEL} htmlFor={subjectId}>
            Subject
          </label>
          <InsertMenu
            fieldLabel="the subject"
            finalFocus={subjectRef}
            groups={templateGroups}
            onInsert={subjectField.insert}
          />
        </div>
        <Input
          id={subjectId}
          ref={subjectRef}
          className="h-8 text-[13px]"
          placeholder={EMAIL_DEFAULT_SUBJECT}
          value={data.subject}
          onChange={(event) => set({ subject: event.target.value })}
          onFocus={subjectField.onFocus}
        />
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className={SECTION_LABEL} htmlFor={bodyId}>
            Body
          </label>
          <InsertMenu
            fieldLabel="the body"
            finalFocus={bodyRef}
            groups={templateGroups}
            onInsert={bodyField.insert}
          />
        </div>
        <Textarea
          id={bodyId}
          ref={bodyRef}
          aria-invalid={bodyIssue !== null}
          className="max-h-80 min-h-32 text-[13px] leading-relaxed"
          /*
           * Mode-aware, because `{{item.…}}` only resolves while iterating — a single
           * email that copied this placeholder would fail with "unknown reference".
           */
          placeholder={
            perItem ? "Hi {{item.name}}, thanks for the review!" : "Thanks for your feedback!"
          }
          value={data.body}
          onBlur={() => markTouched("body")}
          onChange={(event) => set({ body: event.target.value })}
          onFocus={bodyField.onFocus}
        />
        {bodyIssue && (
          <p role="alert" className="px-1 text-[11px] leading-snug text-destructive">
            {bodyIssue}
          </p>
        )}
      </section>
    </>
  );
}
