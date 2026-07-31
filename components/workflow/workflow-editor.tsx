"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { RouteError, getRoute } from "@/lib/api/route-client";
import type { WorkflowDetail } from "@/types/workflow.types";
import { FileQuestion } from "lucide-react";

/*
 * Loads one saved workflow and hands it to the canvas.
 *
 * The fetch runs in the browser against this app's own route rather than
 * server-side against the service layer, so that the access token and the
 * refresh dance stay in the Route Handler — the one place allowed to hold them.
 * The cost is a moment of skeleton instead of a server-rendered canvas.
 */
export function WorkflowEditorPage({ workflowId }: { workflowId: string }) {
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
   * No reset when `workflowId` changes: the page keys this component on the id,
   * so a different workflow arrives as a fresh mount rather than as a prop change
   * to unwind.
   */
  useEffect(() => {
    let live = true;

    getRoute<WorkflowDetail>(`/api/workflows/${workflowId}`)
      .then((data) => live && setWorkflow(data))
      .catch((cause: unknown) => {
        if (!live) return;
        setError(
          cause instanceof RouteError && cause.status === 404
            ? "That workflow doesn’t exist, or isn’t yours."
            : cause instanceof RouteError
              ? cause.message
              : "Could not load that workflow.",
        );
      });

    return () => {
      live = false;
    };
  }, [workflowId]);

  if (error) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>Nothing to open</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/workflows" />} size="sm" variant="outline">
            Back to workflows
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (!workflow) {
    // Shaped like the canvas it replaces — a title bar and a wide pane — so the
    // page doesn't jump when the graph arrives.
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  return <WorkflowCanvas workflow={workflow} />;
}
