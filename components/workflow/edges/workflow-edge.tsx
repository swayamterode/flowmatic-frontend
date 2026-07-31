"use client";

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  useStore,
  type EdgeProps,
} from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRequestInsert } from "@/components/workflow/insert-target";
import { RUN_TONE_STROKE, useRunTone } from "@/components/workflow/run-status";
import { cn } from "@/lib/utils";

/*
 * A connection you can act on. Hovering it offers the two things you ever want from
 * a link in a chain: put something in the middle, or cut it.
 *
 * Drawn as a bezier. Two nodes sharing a centre line — the normal case, since a node
 * added through a `+` is seated on one — flatten to a straight horizontal run, so the
 * curve only ever appears where there is a real vertical offset to cross.
 */

/** Widened hit area, so a thin stroke is still comfortable to hover. */
const EDGE_HIT_WIDTH = 24;

function WorkflowEdgeComponent({
  id,
  target,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const requestInsert = useRequestInsert();

  /*
   * The edge takes its run colour from the node it points *into*, not the one it
   * leaves. Following the source would be the more literal reading — the data did
   * leave — but it makes an edge red never, and a chain that stops needs a trail
   * ending at the break rather than a green run into a red card. Because a node can
   * only succeed once all of its sources have, reading the target also gives the
   * right answer for green.
   */
  const tone = useRunTone(target);

  /*
   * Two booleans rather than one `hovered`: the controls render into React Flow's
   * edge-label layer, a different DOM subtree from the SVG path, so the CSS
   * `group-hover` trick NodeActionBar documents cannot reach across. Crossing from
   * the path to the bar fires leave-then-enter out of a single pointermove, which
   * React batches into one render — the bar doesn't blink out mid-reach.
   */
  const [onPath, setOnPath] = useState(false);
  const [onBar, setOnBar] = useState(false);
  // Selection keeps the bar open, so the actions aren't hover-only.
  const active = onPath || onBar || Boolean(selected);

  /*
   * The bar lives inside the viewport transform, so at minZoom its 28px buttons
   * would shrink to an 11px target. Counter-scaling below 1:1 keeps them hittable,
   * while zooming in still scales them with the nodes. Returning a constant while
   * the bar is hidden keeps panning from re-rendering every idle edge.
   */
  const zoom = useStore((state) => (active ? state.transform[2] : 1));
  const scale = zoom < 1 ? 1 / zoom : 1;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/*
       * The pointer handlers go on a wrapper rather than on BaseEdge, which spreads
       * SVG props onto the visible path alone — that would leave the hairline as the
       * hover target. Wrapping also catches the wide interaction path it renders.
       */}
      <g onPointerEnter={() => setOnPath(true)} onPointerLeave={() => setOnPath(false)}>
        <BaseEdge
          id={id}
          path={path}
          interactionWidth={EDGE_HIT_WIDTH}
          markerEnd={markerEnd}
          /*
           * Only the visible path takes the class — BaseEdge keeps its own wide
           * interaction path separate, so the dashes never touch the hit area.
           */
          className={cn(tone === "running" && "run-flow")}
          /*
           * Hover still outranks the run's colour. An edge is the only route to the
           * insert and delete buttons, so that affordance has to answer the same way
           * whether or not a run is on screen.
           */
          style={{
            ...style,
            stroke: active ? "var(--brand)" : (RUN_TONE_STROKE[tone] ?? style?.stroke),
          }}
        />
      </g>

      <EdgeLabelRenderer>
        {/* Pins the bar's centre to the midpoint of the curve. */}
        <div
          className="absolute"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {/*
           * The p-3 is the hover bridge — the same job pb-3 does in NodeActionBar.
           * The padded box is centred on the stroke, so travelling along the edge
           * into the buttons never crosses dead space. Scaling sits on this element
           * so it grows about that same centre.
           */}
          <div
            className={cn(
              "nodrag nopan p-3 transition-opacity duration-150",
              active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
            )}
            style={{ transform: `scale(${scale})` }}
            onPointerEnter={() => setOnBar(true)}
            onPointerLeave={() => setOnBar(false)}
          >
            <div className="flex items-center gap-0.5 rounded-xl border bg-popover p-1 shadow-xs">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label="Insert node on this connection"
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-brand"
                      onClick={() => requestInsert({ kind: "edge", edgeId: id })}
                    />
                  }
                >
                  <Plus />
                </TooltipTrigger>
                <TooltipContent>Insert node</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label="Delete connection"
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => void deleteElements({ edges: [{ id }] })}
                    />
                  }
                >
                  <Trash2 />
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const WorkflowEdge = memo(WorkflowEdgeComponent);
