"use client";

import { useNodesData } from "@xyflow/react";
import { Database, Mail, MousePointerClick, Play, Sparkles } from "lucide-react";

import { AiNodeFields } from "@/components/workflow/ai-node-editor";
import { formatBytes } from "@/components/workflow/csv-preview";
import { EmailNodeFields } from "@/components/workflow/email-node-editor";
import { EMAIL_DEFAULT_SUBJECT } from "@/components/workflow/email-fields";
import { NodeEditorShell, SECTION_LABEL } from "@/components/workflow/node-editor-shell";
import type { NodeCatalogItem } from "@/components/workflow/node-catalog";
import { NodeResult } from "@/components/workflow/node-result";
import type { TabSelection } from "@/components/workflow/node-rail";
import type { DatasourceNodeType } from "@/components/workflow/nodes/datasource-node";
import { NodesPanel } from "@/components/workflow/nodes-panel";
import { RunSummaryTab } from "@/components/workflow/run-summary-tab";
import type { WorkflowNode } from "@/components/workflow/types";
import type { NodeRun, RunDetail } from "@/types/run.types";

/*
 * Whatever the rail's selection points at, rendered in the one slide-out slot.
 * A node tab combines that node's own fields (where it has any) with its
 * latest run result; the Run tab is the compact overview; the catalog tab is
 * unchanged, just relocated into this shared slot.
 */

type NodeTabContentProps = {
  selection: Exclude<TabSelection, null>;
  runId: number | null;
  onNodeUpdated: (updated: NodeRun) => void;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
  detail: RunDetail | null;
  error: string | null;
  busy: boolean;
  nodes: WorkflowNode[];
  insertMode: boolean;
  onAdd: (item: NodeCatalogItem) => void;
};

type ResultSectionProps = {
  nodeId: string;
  runId: number | null;
  onNodeUpdated: (updated: NodeRun) => void;
};

function ResultSection({ nodeId, runId, onNodeUpdated }: ResultSectionProps) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className={SECTION_LABEL}>Result</h3>
      <NodeResult nodeId={nodeId} runId={runId} onNodeUpdated={onNodeUpdated} />
    </section>
  );
}

type NodeTabProps = {
  nodeId: string;
  runId: number | null;
  onNodeUpdated: (updated: NodeRun) => void;
  onClose: () => void;
};

function NodeTab({ nodeId, runId, onNodeUpdated, onClose }: NodeTabProps) {
  const node = useNodesData<WorkflowNode>(nodeId);
  // The canvas stops rendering this tab when its node goes, but a render can
  // still slip through in between.
  if (!node) return null;

  switch (node.type) {
    case "ai":
      return (
        <NodeEditorShell
          Icon={Sparkles}
          title="AI"
          badge={nodeId}
          onClose={onClose}
          footer="The model is configured on the server."
        >
          <AiNodeFields key={nodeId} nodeId={nodeId} />
          <ResultSection nodeId={nodeId} runId={runId} onNodeUpdated={onNodeUpdated} />
        </NodeEditorShell>
      );
    case "email":
      return (
        <NodeEditorShell
          Icon={Mail}
          title="Email"
          badge={nodeId}
          onClose={onClose}
          footer={
            <>
              Sent from the address configured on the server. A blank subject becomes “
              {EMAIL_DEFAULT_SUBJECT}”.
            </>
          }
        >
          <EmailNodeFields nodeId={nodeId} />
          <ResultSection nodeId={nodeId} runId={runId} onNodeUpdated={onNodeUpdated} />
        </NodeEditorShell>
      );
    case "datasource": {
      const file = (node as DatasourceNodeType).data.file;
      return (
        <NodeEditorShell Icon={Database} title="Datasource" badge={nodeId} onClose={onClose}>
          <section className="flex flex-col gap-1.5">
            <h3 className={SECTION_LABEL}>File</h3>
            {file ? (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="flex flex-col items-center gap-0.5 rounded-lg border bg-muted/30 px-2 py-1.5">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {file.rowCount}
                    </span>
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Rows
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 rounded-lg border bg-muted/30 px-2 py-1.5">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {file.columns.length}
                    </span>
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Columns
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 rounded-lg border bg-muted/30 px-2 py-1.5">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {formatBytes(file.size)}
                    </span>
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Size
                    </span>
                  </div>
                </div>
                <p className="truncate text-center text-[11px] text-muted-foreground">
                  {file.name}
                </p>
              </>
            ) : (
              <p className="px-1 text-[13px] leading-snug text-muted-foreground">
                Drop a CSV on the node card to configure this step.
              </p>
            )}
          </section>
          <ResultSection nodeId={nodeId} runId={runId} onNodeUpdated={onNodeUpdated} />
        </NodeEditorShell>
      );
    }
    case "manualTrigger":
      return (
        <NodeEditorShell Icon={MousePointerClick} title="Trigger" badge={nodeId} onClose={onClose}>
          <section className="flex flex-col gap-1.5">
            <h3 className={SECTION_LABEL}>Configuration</h3>
            <p className="px-1 text-[13px] leading-snug text-muted-foreground">
              Starts the workflow — nothing to configure.
            </p>
          </section>
          <ResultSection nodeId={nodeId} runId={runId} onNodeUpdated={onNodeUpdated} />
        </NodeEditorShell>
      );
    default:
      return null;
  }
}

export function NodeTabContent({
  selection,
  runId,
  onNodeUpdated,
  onSelectNode,
  onClose,
  detail,
  error,
  busy,
  nodes,
  insertMode,
  onAdd,
}: NodeTabContentProps) {
  if (selection.kind === "catalog") {
    return <NodesPanel insertMode={insertMode} onAdd={onAdd} onClose={onClose} />;
  }

  if (selection.kind === "run") {
    return (
      <NodeEditorShell
        Icon={Play}
        title="Run"
        badge={detail ? `#${detail.runId}` : undefined}
        onClose={onClose}
      >
        <RunSummaryTab
          detail={detail}
          error={error}
          busy={busy}
          nodes={nodes}
          onSelectNode={onSelectNode}
        />
      </NodeEditorShell>
    );
  }

  return (
    <NodeTab
      key={selection.nodeId}
      nodeId={selection.nodeId}
      runId={runId}
      onNodeUpdated={onNodeUpdated}
      onClose={onClose}
    />
  );
}
