import type { ReactNode } from "react";
import { Mail } from "lucide-react";

/**
 * One entry per guide under /docs. Adding a topic here and creating
 * app/(dashboard)/docs/<slug>/page.tsx is the whole registration step — the
 * index page and the sidebar both read this list, nothing else to update.
 */
export type DocTopic = {
  slug: string;
  title: string;
  description: string;
  icon: ReactNode;
};

export const DOC_TOPICS: DocTopic[] = [
  {
    slug: "email-integration",
    title: "Sending email from a workflow",
    description:
      "Pair an AI node with an Email node to write and send a real, per-customer message — not a status update.",
    icon: <Mail className="size-4" />,
  },
];
