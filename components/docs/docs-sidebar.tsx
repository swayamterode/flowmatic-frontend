"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenIcon } from "lucide-react";

import { DOC_TOPICS } from "@/components/docs/docs-config";
import { cn } from "@/lib/utils";

/**
 * The left rail is this app's one recurring "you are here" mark (see the
 * hover/focus rail on workflow-list rows) — carried here as the active state
 * instead of a plain background fill.
 */
const LINK_CLASS =
  "flex items-center gap-2 rounded-md border-l-2 border-transparent py-1.5 pr-2.5 pl-3 text-[13px] font-medium transition-colors hover:bg-muted/60";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 flex w-52 shrink-0 flex-col gap-0.5 self-start">
      <Link
        href="/docs"
        className={cn(
          LINK_CLASS,
          pathname === "/docs"
            ? "border-brand bg-muted/60 text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <BookOpenIcon className="size-3.5 shrink-0" strokeWidth={1.75} />
        Overview
      </Link>

      <div className="mt-4 mb-1 px-3 text-[11px] font-medium tracking-wider text-muted-foreground/80 uppercase">
        Guides
      </div>

      {DOC_TOPICS.map((topic) => {
        const href = `/docs/${topic.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={topic.slug}
            href={href}
            className={cn(
              LINK_CLASS,
              active
                ? "border-brand bg-muted/60 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {topic.title}
          </Link>
        );
      })}
    </nav>
  );
}
