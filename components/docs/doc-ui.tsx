import type { ReactNode } from "react";
import { InfoIcon, TriangleAlertIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** A `{{token}}` or field name, styled like the editors that actually use them. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12.5px] text-foreground">
      {children}
    </code>
  );
}

/** A multi-line prompt or config example. */
export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/50 px-3.5 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-foreground">
      {children}
    </pre>
  );
}

/** One row in a "what each field means" table — the shape every guide's config section uses. */
export function FieldRow({ name, value }: { name: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-32 shrink-0 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {name}
      </dt>
      <dd className="min-w-0 text-[13px] leading-relaxed">{value}</dd>
    </div>
  );
}

type CalloutTone = "warn" | "neutral";

/** A pulled-out-of-the-flow note — a mistake to avoid or a rule worth repeating. */
export function Callout({
  tone = "neutral",
  children,
}: {
  tone?: CalloutTone;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed",
        tone === "warn"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-brand/25 bg-brand/5 text-foreground",
      )}
    >
      {tone === "warn" ? (
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      ) : (
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} />
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

/**
 * The brand rail marks "current" throughout the app (see the hover/focus rail
 * on workflow-list rows and the active link in DocsSidebar) — carried here so
 * a section heading reads as the same kind of waypoint.
 */
export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-l-2 border-brand pl-2.5 font-heading text-base font-medium tracking-tight text-foreground">
      {children}
    </h2>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <H2>{title}</H2>
      {children}
    </section>
  );
}
