"use client";

import { useNodeConnections } from "@xyflow/react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRequestInsert } from "@/components/workflow/insert-target";

type NodeAddTailProps = {
  nodeId: string;
  /** Only needed once a node grows more than one output, as a CONDITION will. */
  handleId?: string | null;
};

/*
 * The end of the chain: a hairline and a dashed `+` reaching out of a node's source
 * handle. Shared by every node type that has an output, so a chain can be grown from
 * wherever it currently stops.
 *
 * It renders only while that output is free. A `+` means "nothing follows this yet" —
 * once an edge is attached the edge carries its own insert control, and leaving a
 * second one on the node would offer two ways to do the same thing while quietly
 * building a branch.
 */
export function NodeAddTail({ nodeId, handleId = null }: NodeAddTailProps) {
  // `id` fills itself in from the surrounding node, but the handle still has to be
  // named so a multi-output node reports per-output rather than in aggregate.
  const connections = useNodeConnections({
    handleType: "source",
    handleId: handleId ?? undefined,
  });
  const requestInsert = useRequestInsert();

  if (connections.length > 0) return null;

  return (
    // The tail belongs to the node, not the canvas, so it travels with it.
    <div className="pointer-events-none absolute top-1/2 left-full flex -translate-y-1/2 items-center pl-1.5">
      <span aria-hidden className="h-px w-9 bg-border" />
      <Button
        aria-label="Add next node"
        size="icon-sm"
        variant="ghost"
        className="nodrag nopan pointer-events-auto border border-dashed bg-card text-muted-foreground hover:border-brand/50 hover:bg-card hover:text-brand"
        onClick={() => requestInsert({ kind: "append", nodeId, handleId })}
      >
        <Plus />
      </Button>
    </div>
  );
}
