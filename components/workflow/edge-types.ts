import type { EdgeTypes } from "@xyflow/react";

import { SUB_EDGE_TYPE, WORKFLOW_EDGE_TYPE } from "./graph-ops";
import { SubEdge } from "./edges/sub-edge";
import { WorkflowEdge } from "./edges/workflow-edge";

/*
 * Module scope matters here for the same reason it does in `node-types.ts`: React
 * Flow compares this object by identity, so an inline map would re-mount every edge
 * on each render — and take its hover state with it.
 */
export const edgeTypes = {
  [WORKFLOW_EDGE_TYPE]: WorkflowEdge,
  [SUB_EDGE_TYPE]: SubEdge,
} satisfies EdgeTypes;
