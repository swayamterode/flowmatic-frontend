import type { AiNodeType } from "@/components/workflow/nodes/ai-node";
import type { ChatModelNodeType } from "@/components/workflow/nodes/chat-model-node";
import type { DatasourceNodeType } from "@/components/workflow/nodes/datasource-node";
import type { EmailNodeType } from "@/components/workflow/nodes/email-node";
import type { ManualTriggerNodeType } from "@/components/workflow/nodes/manual-trigger-node";
import type { StickyNoteNodeType } from "@/components/workflow/nodes/sticky-note-node";

/*
 * Every node the canvas can hold. Lives in its own module so the canvas and the
 * node components can both reach it without importing each other.
 */
export type WorkflowNode =
  | AiNodeType
  | ChatModelNodeType
  | DatasourceNodeType
  | EmailNodeType
  | ManualTriggerNodeType
  | StickyNoteNodeType;
