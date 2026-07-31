import type { XYPosition } from "@xyflow/react";
import { Cpu, Database, Mail, Sparkles, StickyNote, type LucideIcon } from "lucide-react";

import { AI_DEFAULT_OUTPUT } from "@/components/workflow/ai-fields";
import { EMAIL_DEFAULT_DATA } from "@/components/workflow/email-fields";
import { nextId, NODE_Z_INDEX, NOTE_Z_INDEX } from "@/components/workflow/node-defaults";
import { AI_DEFAULT_SIZE, AI_WIDTH, type AiNodeType } from "@/components/workflow/nodes/ai-node";
import {
  CHAT_MODEL_DEFAULT_SIZE,
  createChatModelNode,
} from "@/components/workflow/nodes/chat-model-node";
import {
  DATASOURCE_DEFAULT_SIZE,
  DATASOURCE_WIDTH,
  type DatasourceNodeType,
} from "@/components/workflow/nodes/datasource-node";
import {
  EMAIL_DEFAULT_SIZE,
  EMAIL_WIDTH,
  type EmailNodeType,
} from "@/components/workflow/nodes/email-node";
import {
  STICKY_NOTE_DEFAULT_SIZE,
  STICKY_NOTE_PLACEHOLDER,
  type StickyNoteNodeType,
} from "@/components/workflow/nodes/sticky-note-node";
import type { WorkflowNode } from "@/components/workflow/types";

export type NodeGroupKey = "notes" | "triggers" | "data" | "ai" | "actions";

export type NodeCatalogItem = {
  key: string;
  label: string;
  description: string;
  group: NodeGroupKey;
  Icon: LucideIcon;
  keywords?: readonly string[];
  connectable?: boolean;
  size: { width: number; height: number };
  create: (position: XYPosition) => WorkflowNode;
};

export const NODE_GROUPS = [
  { key: "notes", label: "Notes" },
  { key: "triggers", label: "Triggers" },
  { key: "data", label: "Data" },
  { key: "ai", label: "AI" },
  { key: "actions", label: "Actions" },
] as const satisfies readonly { key: NodeGroupKey; label: string }[];

export const STICKY_NOTE_ITEM: NodeCatalogItem = {
  key: "stickyNote",
  label: "Sticky note",
  description: "Markdown note to annotate the canvas",
  group: "notes",
  Icon: StickyNote,
  keywords: ["comment", "markdown", "label", "documentation"],
  size: STICKY_NOTE_DEFAULT_SIZE,
  create: (position) =>
    ({
      id: nextId("note"),
      type: "stickyNote",
      position,
      style: { ...STICKY_NOTE_DEFAULT_SIZE },
      zIndex: NOTE_Z_INDEX,
      data: { content: STICKY_NOTE_PLACEHOLDER },
    }) satisfies StickyNoteNodeType,
};

export const DATASOURCE_ITEM: NodeCatalogItem = {
  key: "datasource",
  label: "Datasource",
  description: "Load rows from a CSV file",
  group: "data",
  Icon: Database,
  keywords: ["csv", "file", "upload", "data", "rows", "table", "import", "spreadsheet"],
  connectable: true,
  size: DATASOURCE_DEFAULT_SIZE,
  create: (position) =>
    ({
      id: nextId("datasource"),
      type: "datasource",
      position,
      /*
       * Width only. The card is shorter once it holds a file, so pinning a height
       * here would leave it padded with dead space.
       */
      style: { width: DATASOURCE_WIDTH },
      zIndex: NODE_Z_INDEX,
      data: {},
    }) satisfies DatasourceNodeType,
};

export const AI_ITEM: NodeCatalogItem = {
  key: "ai",
  label: "AI",
  description: "Prompt a model for named output fields",
  group: "ai",
  Icon: Sparkles,
  keywords: [
    "ai",
    "model",
    "llm",
    "prompt",
    "groq",
    "generate",
    "classify",
    "extract",
    "summarize",
  ],
  connectable: true,
  size: AI_DEFAULT_SIZE,
  create: (position) =>
    ({
      id: nextId("ai"),
      type: "ai",
      position,
      // Width only. The card is taller once it holds a prompt, so a pinned height
      // would leave it padded with dead space — as with the datasource.
      style: { width: AI_WIDTH },
      zIndex: NODE_Z_INDEX,
      /*
       * One field to start with. An AI node that declares no outputs produces
       * nothing any downstream node can reference, so an empty list would be a
       * dead end rather than a blank slate.
       */
      data: { prompt: "", output: [AI_DEFAULT_OUTPUT] },
    }) satisfies AiNodeType,
};

/*
 * No `connectable`, like the sticky note — this can be dropped anywhere but is never
 * offered as a chain insert. A model has no input and no output: it attaches upward
 * into an AI card's slot, so splicing one into a connection would be nonsense.
 */
export const CHAT_MODEL_ITEM: NodeCatalogItem = {
  key: "chatModel",
  label: "Chat model",
  description: "The model an AI node runs on",
  group: "ai",
  Icon: Cpu,
  keywords: ["chat", "model", "groq", "llm", "provider", "ai", "agent"],
  size: CHAT_MODEL_DEFAULT_SIZE,
  create: createChatModelNode,
};

export const EMAIL_ITEM: NodeCatalogItem = {
  key: "email",
  label: "Email",
  description: "Send an email, once or per item",
  group: "actions",
  Icon: Mail,
  keywords: ["email", "mail", "send", "output", "notify", "smtp", "message"],
  connectable: true,
  size: EMAIL_DEFAULT_SIZE,
  create: (position) =>
    ({
      id: nextId("email"),
      type: "email",
      position,
      // Width only — the card is taller once configured, as with the other cards.
      style: { width: EMAIL_WIDTH },
      zIndex: NODE_Z_INDEX,
      data: { ...EMAIL_DEFAULT_DATA },
    }) satisfies EmailNodeType,
};

export const NODE_CATALOG: readonly NodeCatalogItem[] = [
  STICKY_NOTE_ITEM,
  DATASOURCE_ITEM,
  AI_ITEM,
  CHAT_MODEL_ITEM,
  EMAIL_ITEM,
];

export function findCatalogItem(key: string) {
  return NODE_CATALOG.find((item) => item.key === key);
}
export function matchesQuery(item: NodeCatalogItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [item.label, item.description, ...(item.keywords ?? [])].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export const NODE_DRAG_MIME = "application/x-workflow-node";
