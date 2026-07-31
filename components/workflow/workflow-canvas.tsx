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
import { FlaskConical, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { edgeTypes } from "@/components/workflow/edge-types";
import { EditorTargetProvider } from "@/components/workflow/editor-target";
import { WORKFLOW_EDGE_TYPE } from "@/components/workflow/graph-ops";
import { InsertTargetProvider, type InsertTarget } from "@/components/workflow/insert-target";
import { hasNodeEditor, NodeEditorPanel } from "@/components/workflow/node-editor-panel";
import { nodeTypes } from "@/components/workflow/node-types";
import {
  findCatalogItem,
  NODE_DRAG_MIME,
  STICKY_NOTE_ITEM,
  type NodeCatalogItem,
} from "@/components/workflow/node-catalog";
import { NodesPanel } from "@/components/workflow/nodes-panel";
import type { NodeAction } from "@/components/workflow/nodes/manual-trigger-node";
import { RunPanel } from "@/components/workflow/run-panel";
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
const NODES_PANEL_ID = "workflow-nodes-panel";
const EDITOR_PANEL_ID = "workflow-node-editor-panel";
const RUN_PANEL_ID = "workflow-run-panel";
const NODES_OVERLAY_PANEL_IDS = [SPACER_PANEL_ID, NODES_PANEL_ID];
const EDITOR_OVERLAY_PANEL_IDS = [SPACER_PANEL_ID, EDITOR_PANEL_ID];
const RUN_OVERLAY_PANEL_IDS = [SPACER_PANEL_ID, RUN_PANEL_ID];

/*
 * What currently occupies the right-hand overlay. The nodes catalog, a node's config
 * panel and the run log all want the same strip of screen, so one state rather than a
 * flag each makes "never two at once" structural instead of a rule to remember.
 *
 * `nodeEditor` is deliberately not one kind per node type — the panel it opens
 * dispatches on the node itself, so a new configurable node type adds a case there
 * rather than a member here.
 */
type RightPanel =
  { kind: "nodes" } | { kind: "nodeEditor"; nodeId: string } | { kind: "run" } | null;

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
  const nodesPanelRef = useRef<HTMLDivElement | null>(null);
  const editorPanelRef = useRef<HTMLDivElement | null>(null);
  const runPanelRef = useRef<HTMLDivElement | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);

  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);

  /*
   * Whichever overlay is mounted, so a node added while one is open still lands in
   * the part of the canvas the user can see. `isConnected` is what decides, not
   * which ref is set: a closed panel leaves its ref pointing at a detached element.
   */
  const getRightPanelWidth = useCallback(() => {
    for (const element of [nodesPanelRef.current, editorPanelRef.current, runPanelRef.current]) {
      if (element?.isConnected) return element.offsetWidth;
    }
    return 0;
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

  /*
   * A layout per overlay, so the catalog and a config panel each remember their own
   * width — a panel that inherited whatever the last one was resized to would look
   * like it had drifted.
   */
  const run = useWorkflowRun({ save });

  const nodesLayout = useDefaultLayout({
    id: "workflow-nodes-overlay",
    panelIds: NODES_OVERLAY_PANEL_IDS,
    storage: layoutStorage,
  });

  const editorLayout = useDefaultLayout({
    id: "workflow-node-editor-overlay",
    panelIds: EDITOR_OVERLAY_PANEL_IDS,
    storage: layoutStorage,
  });

  const runLayout = useDefaultLayout({
    id: "workflow-run-overlay",
    panelIds: RUN_OVERLAY_PANEL_IDS,
    storage: layoutStorage,
  });

  const toggleNodesPanel = useCallback(() => {
    setRightPanel((current) => (current?.kind === "nodes" ? null : { kind: "nodes" }));
    setInsertTarget(null);
  }, []);

  const closeRightPanel = useCallback(() => {
    setRightPanel(null);
    setInsertTarget(null);
  }, []);

  const requestInsert = useCallback((target: InsertTarget) => {
    setInsertTarget(target);
    setRightPanel({ kind: "nodes" });
  }, []);

  const requestEditor = useCallback((nodeId: string) => {
    setInsertTarget(null);
    setRightPanel({ kind: "nodeEditor", nodeId });
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
        toggleNodesPanel();
        return;
      }

      if (key === "escape") closeRightPanel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addNote, closeRightPanel, toggleNodesPanel]);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!(event.target as HTMLElement).classList.contains("react-flow__pane")) return;
      addItemAtScreenPoint(STICKY_NOTE_ITEM, event.clientX, event.clientY);
    },
    [addItemAtScreenPoint],
  );

  const isOverNodesPanel = useCallback(
    (target: EventTarget | null) => !!nodesPanelRef.current?.contains(target as Node),
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
      if (isOverNodesPanel(event.target)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [isOverNodesPanel, isStrayFileDrag],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (isStrayFileDrag(event)) {
        event.preventDefault();
        return;
      }
      const key = event.dataTransfer.getData(NODE_DRAG_MIME);
      if (!key || isOverNodesPanel(event.target)) return;
      event.preventDefault();
      const item = findCatalogItem(key);
      if (!item) return;
      setInsertTarget(null);
      addItemAtScreenPoint(item, event.clientX, event.clientY);
    },
    [addItemAtScreenPoint, isOverNodesPanel, isStrayFileDrag],
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
      setRightPanel(null);
    },
    [addItemAtPaneCenter, appendItemAfterNode, insertItemOnEdge, insertTarget],
  );

  const handleExecute = useCallback(() => {
    if (onExecute) return onExecute();
    // The panel opens first so the run is visible from the moment it is queued,
    // rather than appearing once something has already happened.
    setInsertTarget(null);
    setRightPanel({ kind: "run" });
    void run.start();
  }, [onExecute, run]);

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

  /*
   * Derived rather than cleaned up in an effect: a node can be deleted from under
   * an open panel — by the keyboard, a marquee, or its own toolbar — and reading the
   * live node list means the panel is gone in the same render as the node, with no
   * frame in between showing an editor for something that no longer exists.
   */
  const editorNodeId =
    rightPanel?.kind === "nodeEditor" &&
    nodes.some((node) => node.id === rightPanel.nodeId && hasNodeEditor(node))
      ? rightPanel.nodeId
      : null;

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

              {!rightPanel && (
                <Panel position="top-right" className="my-3 px-2">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          aria-expanded={false}
                          aria-keyshortcuts="N"
                          aria-label="Open nodes panel"
                          size="icon"
                          variant="outline"
                          className="bg-card shadow-xs"
                          onClick={toggleNodesPanel}
                        />
                      }
                    >
                      <Plus />
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Open nodes panel
                      <Kbd>N</Kbd>
                    </TooltipContent>
                  </Tooltip>
                </Panel>
              )}

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
             * Every overlay is absolutely positioned over the canvas rather than
             * sharing the row with it: the graph keeps its size and its viewport when
             * one opens, so nothing the user was looking at moves.
             */}
            {rightPanel?.kind === "nodes" && (
              <ResizablePanelGroup
                className="pointer-events-none absolute inset-0 z-20"
                defaultLayout={nodesLayout.defaultLayout}
                onLayoutChanged={nodesLayout.onLayoutChanged}
              >
                <ResizablePanel id={SPACER_PANEL_ID} minSize="20" />
                <ResizableHandle
                  withHandle
                  className="pointer-events-auto bg-transparent [&>div]:bg-muted-foreground/40"
                />
                <ResizablePanel
                  elementRef={nodesPanelRef}
                  id={NODES_PANEL_ID}
                  className="pointer-events-auto shadow-lg"
                  defaultSize={320}
                  minSize={240}
                  maxSize={480}
                >
                  <NodesPanel
                    insertMode={insertTarget !== null}
                    onAdd={handlePanelAdd}
                    onClose={closeRightPanel}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            {editorNodeId && (
              <ResizablePanelGroup
                className="pointer-events-none absolute inset-0 z-20"
                defaultLayout={editorLayout.defaultLayout}
                onLayoutChanged={editorLayout.onLayoutChanged}
              >
                <ResizablePanel id={SPACER_PANEL_ID} minSize="20" />
                <ResizableHandle
                  withHandle
                  className="pointer-events-auto bg-transparent [&>div]:bg-muted-foreground/40"
                />
                <ResizablePanel
                  elementRef={editorPanelRef}
                  id={EDITOR_PANEL_ID}
                  className="pointer-events-auto shadow-lg"
                  defaultSize={400}
                  minSize={320}
                  maxSize={620}
                >
                  {/*
                   * Keyed on the node, so moving between two nodes remounts the panel
                   * rather than carrying the first one's focus and caret over.
                   */}
                  <NodeEditorPanel
                    key={editorNodeId}
                    nodeId={editorNodeId}
                    onClose={closeRightPanel}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}

            {rightPanel?.kind === "run" && (
              <ResizablePanelGroup
                className="pointer-events-none absolute inset-0 z-20"
                defaultLayout={runLayout.defaultLayout}
                onLayoutChanged={runLayout.onLayoutChanged}
              >
                <ResizablePanel id={SPACER_PANEL_ID} minSize="20" />
                <ResizableHandle
                  withHandle
                  className="pointer-events-auto bg-transparent [&>div]:bg-muted-foreground/40"
                />
                <ResizablePanel
                  elementRef={runPanelRef}
                  id={RUN_PANEL_ID}
                  className="pointer-events-auto shadow-lg"
                  defaultSize={400}
                  minSize={320}
                  maxSize={620}
                >
                  <RunPanel
                    busy={run.busy}
                    detail={run.detail}
                    error={run.error}
                    nodes={nodes}
                    onClose={closeRightPanel}
                    onNodeUpdated={run.applyNodeUpdate}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
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
