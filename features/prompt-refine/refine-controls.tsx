"use client";

import { Undo, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MESSAGE_MAX_CHARS } from "@/features/prompt-refine/types";
import type { PromptRefinement } from "@/features/prompt-refine/use-refine-prompt";

type RefinePromptButtonProps = {
  busy: boolean;
  unavailable: boolean;
  onRefine: () => void;
};

export function RefinePromptButton({ busy, unavailable, onRefine }: RefinePromptButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-busy={busy}
            aria-label="Refine the prompt with AI"
            className="cursor-pointer text-brand/70 hover:text-brand"
            disabled={unavailable}
            size="icon-sm"
            variant="outline"
            onClick={onRefine}
          />
        }
      >
        {busy ? <Spinner className="size-3.5" /> : <WandSparkles className="size-3.5" />}
      </TooltipTrigger>
      <TooltipContent side="bottom">Rewrite this prompt</TooltipContent>
    </Tooltip>
  );
}

export function RefiningPrompt({ text }: { text: string }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 shimmer overflow-hidden px-2.5 py-2 text-[13px] leading-relaxed wrap-anywhere whitespace-pre-wrap text-muted-foreground [--shimmer-duration:1.4s]"
      >
        {text}
      </div>
      <span className="sr-only" role="status">
        Refining the prompt.
      </span>
    </>
  );
}

export function PromptTooLong({ length }: { length: number }) {
  return (
    <p className="px-1 text-[11px] leading-snug text-muted-foreground">
      {length} / {MESSAGE_MAX_CHARS} characters — too long to refine, but fine to run.
    </p>
  );
}

type RefinedNoticeProps = {
  refinement: PromptRefinement;
  onUndo: () => void;
};

export function RefinedNotice({ refinement, onUndo }: RefinedNoticeProps) {
  const { lost } = refinement;

  return (
    <div className="flex cursor-pointer flex-col gap-0.5 px-1 text-xs leading-snug text-brand/70 hover:text-brand">
      <p className="flex items-center gap-1" role="status">
        <Button
          className="font-normal text-muted-foreground hover:text-foreground"
          variant="outline"
          onClick={onUndo}
          size="icon-sm"
        >
          <Undo className="text-brand" />
        </Button>
      </p>
      {lost.length > 0 && (
        <p>
          Lost {lost.length === 1 ? "reference" : "references"}{" "}
          <span className="font-mono">{lost.join(" ")}</span> — put{" "}
          {lost.length === 1 ? "it" : "them"} back, or undo.
        </p>
      )}
    </div>
  );
}
