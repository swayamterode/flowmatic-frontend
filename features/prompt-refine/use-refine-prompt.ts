"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { lostTokens } from "@/features/prompt-refine/tokens";
import type { MetaPromptResponse } from "@/features/prompt-refine/types";
import { postRoute, RouteError } from "@/lib/api/route-client";

const REFINE_ROUTE = "/api/ai/meta-prompt";

export type PromptRefinement = {
  before: string;
  after: string;
  lost: string[];
};

export function useRefinePrompt(prompt: string, onChange: (next: string) => void) {
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<PromptRefinement | null>(null);

  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const refine = useCallback(() => {
    const message = prompt.trim();
    if (!message || busy) return;

    setBusy(true);

    postRoute<MetaPromptResponse>(REFINE_ROUTE, { message })
      .then(({ prompt: refined }) => {
        if (!live.current) return;
        onChange(refined);
        setRecord({ before: prompt, after: refined, lost: lostTokens(prompt, refined) });
      })
      .catch((cause: unknown) => {
        if (!live.current) return;
        toast.error(cause instanceof RouteError ? cause.message : "Could not refine that prompt.");
      })
      .finally(() => {
        if (live.current) setBusy(false);
      });
  }, [busy, onChange, prompt]);

  const undo = useCallback(() => {
    if (!record) return;
    onChange(record.before);
    setRecord(null);
  }, [onChange, record]);

  const refinement = record && record.after === prompt ? record : null;

  return { busy, refine, undo, refinement };
}
