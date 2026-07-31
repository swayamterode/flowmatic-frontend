"use client";

import { memo } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

/*
 * The dashed link from a chat model up into an AI card's slot.
 *
 * Deliberately inert, where `WorkflowEdge` is not. The two things that edge offers on
 * hover — splice a node into the middle, cut the link — are both meaningless here:
 * nothing can sit between a model and the card it serves, and the model node carries
 * its own delete. So there is no hover bar, and no widened hit area to reach one with.
 *
 * Dashed rather than solid because it isn't a path data travels. Everything else about
 * the stroke is inherited from `--xy-edge-*`, so it stays in step with chain edges.
 */
function SubEdgeComponent({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      interactionWidth={0}
      style={{ strokeDasharray: "4 4", ...style }}
    />
  );
}

export const SubEdge = memo(SubEdgeComponent);
