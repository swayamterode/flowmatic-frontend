import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { DOC_TOPICS } from "@/components/docs/docs-config";

export default function DocsIndexPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Docs</h1>
        <p className="text-sm text-muted-foreground">
          How to wire up the canvas — starting with the node pair people ask about most.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DOC_TOPICS.map((topic) => (
          <Link className="group" key={topic.slug} href={`/documentation/${topic.slug}`}>
            <Card className="h-full gap-3 py-4 shadow-none transition-colors hover:border-brand/40 dark:ring-0">
              <div className="flex items-start justify-between gap-3 px-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors group-hover:border-brand/40 group-hover:text-brand [&_svg]:size-4">
                  {topic.icon}
                </span>
                <ArrowRightIcon
                  aria-hidden="true"
                  className="mt-2 size-4 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </div>
              <div className="space-y-1 px-4">
                <h2 className="text-[14px] font-medium tracking-tight">{topic.title}</h2>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {topic.description}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
