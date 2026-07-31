"use client";

import { cn } from "@/lib/utils";

type NodeActionBarProps = {
  children: React.ReactNode;
  /*
   * Keeps the bar open when hover alone can't be trusted — a selected node, or a
   * popover whose content portals out of this subtree and would otherwise drop
   * the parent's :hover the moment it opened.
   */
  forceVisible?: boolean;
  className?: string;
};

/*
 * Deliberately not React Flow's <NodeToolbar/>: that portals into the viewport
 * layer, so reaching for it counts as leaving the node and the buttons vanish
 * mid-reach. Rendered as a real descendant of a `group` wrapper, hovering the
 * bar keeps the wrapper hovered — resolved by the browser per frame, so there is
 * no state to race. The pb-3 under the buttons is the hover bridge that fills
 * what would otherwise be dead space between the bar and the node.
 */
export function NodeActionBar({ children, forceVisible = false, className }: NodeActionBarProps) {
  return (
    <div
      className={cn(
        "absolute bottom-full left-1/2 flex -translate-x-1/2 justify-center pb-3",
        "pointer-events-none opacity-0 transition-opacity duration-150",
        "group-hover:pointer-events-auto group-hover:opacity-100",
        "focus-within:pointer-events-auto focus-within:opacity-100",
        forceVisible && "pointer-events-auto opacity-100",
        className,
      )}
    >
      <div className="nodrag nopan flex items-center gap-0.5 rounded-xl border bg-popover p-1 shadow-xs">
        {children}
      </div>
    </div>
  );
}
