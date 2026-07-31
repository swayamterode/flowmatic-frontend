import type { NodeTypes } from "@xyflow/react";

import { AiNode } from "./nodes/ai-node";
import { ChatModelNode } from "./nodes/chat-model-node";
import { DatasourceNode } from "./nodes/datasource-node";
import { EmailNode } from "./nodes/email-node";
import { ManualTriggerNode } from "./nodes/manual-trigger-node";
import { StickyNoteNode } from "./nodes/sticky-note-node";

/*
 * Module scope matters here: React Flow compares this object by identity, so an
 * inline map would re-mount every node on each render.
 */
export const nodeTypes = {
  ai: AiNode,
  chatModel: ChatModelNode,
  datasource: DatasourceNode,
  email: EmailNode,
  manualTrigger: ManualTriggerNode,
  stickyNote: StickyNoteNode,
} satisfies NodeTypes;
