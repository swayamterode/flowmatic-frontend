"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useDefaultLayout, type LayoutStorage } from "react-resizable-panels";
import { useTheme } from "next-themes";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Spinner } from "@/components/ui/spinner";
import { edgeTypes } from "@/components/workflow/edge-types";
import { EditorTargetProvider } from "@/components/workflow/editor-target";
import { WORKFLOW_EDGE_TYPE } from "@/components/workflow/graph-ops";
import { InsertTargetProvider, type InsertTarget } from "@/components/workflow/insert-target";
import { nodeTypes } from "@/components/workflow/node-types";
import {
  findCatalogItem,
  NODE_DRAG_MIME,
  STICKY_NOTE_ITEM,
  type NodeCatalogItem,
} from "@/components/workflow/node-catalog";
import {
  isSameTab,
  NodeRail,
  RAIL_WIDTH,
  type TabSelection,
} from "@/components/workflow/node-rail";
import { NodeTabContent } from "@/components/workflow/node-tab-content";
import type { NodeAction } from "@/components/workflow/nodes/manual-trigger-node";
import { RunStatusProvider } from "@/components/workflow/run-status";
import type { WorkflowNode } from "@/components/workflow/types";
import { useWorkflowNodes } from "@/components/workflow/use-workflow-nodes";
import { useWorkflowRun } from "@/components/workflow/use-workflow-run";
import { useWorkflowSave } from "@/components/workflow/use-workflow-save";
import { fromGraph } from "@/components/workflow/workflow-graph";
import { WorkflowTitle } from "@/components/workflow/workflow-title";
import type { WorkflowDetail } from "@/types/workflow.types";

type WorkflowCanvasProps = {
  workflow?: WorkflowDetail | null;
  onExecute?: () => void;
  onNodeAction?: (action: NodeAction, nodeId: string) => void;
};

const PENDING_MESSAGES: Record<Exclude<NodeAction, "execute">, string> = {
  toggle: "Activating and deactivating nodes isn't wired up yet",
  more: "Node options are coming soon",
};

const SPACER_PANEL_ID = "workflow-canvas-spacer";
const TAB_PANEL_ID = "workflow-tab-panel";
const TAB_OVERLAY_PANEL_IDS = [SPACER_PANEL_ID, TAB_PANEL_ID];

const layoutStorage: LayoutStorage = {
  getItem: (key) => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  },
};

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || /^(input|textarea|select)$/i.test(element.tagName ?? "");
}

function WorkflowEditor({ workflow, onExecute, onNodeAction }: WorkflowCanvasProps) {
  const { resolvedTheme } = useTheme();

  const [loaded] = useState(() => (workflow ? fromGraph(workflow.graph) : null));

  const paneRef = useRef<HTMLDivElement>(null);
  const tabPanelRef = useRef<HTMLDivElement | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabSelection>(null);

  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);

  /*
   * The rail is a fixed width and never resizes; the slide-out panel beside it
   * does. Together they're how many pixels of the canvas's right edge are
   * currently covered, so "center of the canvas" means the center of what the
   * user can actually see — a node added while a tab is open doesn't land
   * underneath it.
   */
  const getRightPanelWidth = useCallback(() => {
    const panelWidth = tabPanelRef.current?.isConnected ? tabPanelRef.current.offsetWidth : 0;
    return RAIL_WIDTH + panelWidth;
  }, []);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    onNodesDelete,
    addItemAtScreenPoint,
    addItemAtPaneCenter,
    insertItemOnEdge,
    appendItemAfterNode,
  } = useWorkflowNodes(paneRef, getRightPanelWidth, loaded);

  const {
    name,
    rename,
    status,
    error: saveError,
    lastSavedAt,
    save,
  } = useWorkflowSave({
    workflowId: workflow?.id,
    initialName: workflow?.name,
    nodes,
    edges,
    passthrough: loaded?.passthrough,
  });

  const run = useWorkflowRun({ save });

  const tabPanelLayout = useDefaultLayout({
    id: "workflow-tab-panel-overlay",
    panelIds: TAB_OVERLAY_PANEL_IDS,
    storage: layoutStorage,
  });

  const requestInsert = useCallback((target: InsertTarget) => {
    setInsertTarget(target);
    setSelectedTab({ kind: "catalog" });
  }, []);

  const requestEditor = useCallback((nodeId: string) => {
    setInsertTarget(null);
    setSelectedTab({ kind: "node", nodeId });
  }, []);

  const handleRailSelect = useCallback((tab: TabSelection) => {
    setInsertTarget(null);
    setSelectedTab((current) => (isSameTab(current, tab) ? null : tab));
  }, []);

  const closeRightPanel = useCallback(() => {
    setSelectedTab(null);
    setInsertTarget(null);
  }, []);

  const addNote = useCallback(
    () => void addItemAtPaneCenter(STICKY_NOTE_ITEM),
    [addItemAtPaneCenter],
  );
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if (event.shiftKey) {
        if (key !== "s") return;
        event.preventDefault();
        addNote();
        return;
      }

      if (key === "n") {
        event.preventDefault();
        handleRailSelect({ kind: "catalog" });
        return;
      }

      if (key === "escape") closeRightPanel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addNote, closeRightPanel, handleRailSelect]);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!(event.target as HTMLElement).classList.contains("react-flow__pane")) return;
      addItemAtScreenPoint(STICKY_NOTE_ITEM, event.clientX, event.clientY);
    },
    [addItemAtScreenPoint],
  );

  const isOverTabPanel = useCallback(
    (target: EventTarget | null) => !!tabPanelRef.current?.contains(target as Node),
    [],
  );
  const isStrayFileDrag = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => event.dataTransfer.types.includes("Files"),
    [],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (isStrayFileDrag(event)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "none";
        return;
      }
      if (!event.dataTransfer.types.includes(NODE_DRAG_MIME)) return;
      if (isOverTabPanel(event.target)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [isOverTabPanel, isStrayFileDrag],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (isStrayFileDrag(event)) {
        event.preventDefault();
        return;
      }
      const key = event.dataTransfer.getData(NODE_DRAG_MIME);
      if (!key || isOverTabPanel(event.target)) return;
      event.preventDefault();
      const item = findCatalogItem(key);
      if (!item) return;
      setInsertTarget(null);
      addItemAtScreenPoint(item, event.clientX, event.clientY);
    },
    [addItemAtScreenPoint, isOverTabPanel, isStrayFileDrag],
  );

  const handlePanelAdd = useCallback(
    (item: NodeCatalogItem) => {
      if (!insertTarget) {
        addItemAtPaneCenter(item);
        return;
      }

      const placed =
        insertTarget.kind === "edge"
          ? insertItemOnEdge(item, insertTarget.edgeId)
          : appendItemAfterNode(item, insertTarget.nodeId, insertTarget.handleId);
      if (!placed) addItemAtPaneCenter(item);

      setInsertTarget(null);
      setSelectedTab(null);
    },
    [addItemAtPaneCenter, appendItemAfterNode, insertItemOnEdge, insertTarget],
  );

  /*
   * Derived rather than cleaned up in an effect: a node can be deleted from under
   * an open tab — by the keyboard, a marquee, or its own toolbar — and reading the
   * live node list means the tab is gone in the same render as the node, with no
   * frame in between showing a panel for something that no longer exists.
   */
  const validSelectedTab: TabSelection =
    selectedTab?.kind === "node" && !nodes.some((node) => node.id === selectedTab.nodeId)
      ? null
      : selectedTab;

  const handleExecute = useCallback(() => {
    if (onExecute) return onExecute();
    /*
     * A tab already open stays open — editing a node and hitting Execute keeps
     * watching that node's own result stream in, rather than being knocked onto
     * the Run tab. Only opens Run when nothing was open, so progress is visible
     * from the moment it's queued. Reads `validSelectedTab` (not the raw
     * `selectedTab` state) so a tab left pointing at a since-deleted node — which
     * `validSelectedTab` has already nulled out — doesn't get treated as "still
     * open" here.
     */
    setInsertTarget(null);
    setSelectedTab(validSelectedTab ?? { kind: "run" });
    void run.start();
  }, [onExecute, run, validSelectedTab]);

  const handleNodeAction = useCallback(
    (action: NodeAction, nodeId: string) => {
      if (onNodeAction) return onNodeAction(action, nodeId);
      // The trigger node's "execute" runs the whole workflow — there's no
      // per-node run on the backend, only a run of the graph from its trigger.
      if (action === "execute") return handleExecute();
      toast(PENDING_MESSAGES[action]);
    },
    [onNodeAction, handleExecute],
  );

  const handleNoteMoreOptions = useCallback(() => {
    toast("Note options are coming soon");
  }, []);

  const renderedNodes = useMemo<WorkflowNode[]>(
    () =>
      nodes.map((node) => {
        switch (node.type) {
          case "stickyNote":
            return { ...node, data: { ...node.data, onMoreOptions: handleNoteMoreOptions } };
          case "manualTrigger":
            return { ...node, data: { ...node.data, onAction: handleNodeAction } };
          default:
            return node;
        }
      }),
    [nodes, handleNodeAction, handleNoteMoreOptions],
  );

  return (
    <InsertTargetProvider value={requestInsert}>
      <EditorTargetProvider value={requestEditor}>
        <RunStatusProvider value={{ detail: run.detail, live: run.busy }}>
          <div
            className="relative flex min-h-0 flex-1"
            ref={paneRef}
            onDoubleClick={handleDoubleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <ReactFlow<WorkflowNode>
              nodes={renderedNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: WORKFLOW_EDGE_TYPE }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onNodesDelete={onNodesDelete}
              colorMode={resolvedTheme === "dark" ? "dark" : "light"}
              fitView
              fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
              minZoom={0.4}
              maxZoom={2}
              zoomOnDoubleClick={false}
              className="bg-background"
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
              <Controls showInteractive={false} />

              <Panel position="top-left" className="mx-6 my-3">
                <WorkflowTitle
                  error={saveError}
                  lastSavedAt={lastSavedAt}
                  name={name}
                  status={status}
                  onRename={rename}
                  onSave={save}
                />
              </Panel>

              <Panel position="bottom-center" className="mb-6 flex items-center gap-2">
                <Button
                  className="h-9 gap-2 bg-brand px-4 text-brand-foreground shadow-xs hover:bg-brand/90 dark:text-white"
                  disabled={run.busy}
                  onClick={handleExecute}
                >
                  {run.busy ? <Spinner /> : <FlaskConical />}
                  {run.busy ? "Running…" : "Execute workflow"}
                </Button>
              </Panel>
            </ReactFlow>

            {/*
             * The rail never moves or resizes and sits flush against the right
             * edge; the slide-out panel (when a tab is selected) fills the flex
             * space to its left, so closing it leaves the rail exactly where it
             * was. `justify-end` matters even though the rail is a flex child:
             * with no tab open, it's the only child, and without this it would
             * default to the row's start (the left edge) instead of the right.
             */}
            <div className="pointer-events-none absolute inset-0 z-20 flex justify-end">
              {validSelectedTab && (
                <ResizablePanelGroup
                  className="flex-1"
                  defaultLayout={tabPanelLayout.defaultLayout}
                  onLayoutChanged={tabPanelLayout.onLayoutChanged}
                >
                  <ResizablePanel id={SPACER_PANEL_ID} minSize="20" />
                  <ResizableHandle
                    withHandle
                    className="pointer-events-auto bg-transparent [&>div]:bg-muted-foreground/40"
                  />
                  <ResizablePanel
                    elementRef={tabPanelRef}
                    id={TAB_PANEL_ID}
                    className="pointer-events-auto shadow-lg"
                    defaultSize={400}
                    minSize={320}
                    maxSize={620}
                  >
                    <NodeTabContent
                      selection={validSelectedTab}
                      runId={run.detail?.runId ?? null}
                      onNodeUpdated={run.applyNodeUpdate}
                      onSelectNode={(nodeId) => setSelectedTab({ kind: "node", nodeId })}
                      onClose={closeRightPanel}
                      detail={run.detail}
                      error={run.error}
                      busy={run.busy}
                      nodes={nodes}
                      insertMode={insertTarget !== null}
                      onAdd={handlePanelAdd}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              )}

              <NodeRail
                className="pointer-events-auto"
                nodes={nodes}
                selected={validSelectedTab}
                busy={run.busy}
                onSelect={handleRailSelect}
              />
            </div>
          </div>
        </RunStatusProvider>
      </EditorTargetProvider>
    </InsertTargetProvider>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditor key={props.workflow?.id ?? "new"} {...props} />
    </ReactFlowProvider>
  );
}
