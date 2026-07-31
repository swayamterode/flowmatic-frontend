"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  matchesQuery,
  NODE_CATALOG,
  NODE_DRAG_MIME,
  NODE_GROUPS,
  type NodeCatalogItem,
} from "@/components/workflow/node-catalog";

type NodesPanelProps = {
  onAdd: (item: NodeCatalogItem) => void;
  onClose: () => void;
  /*
   * Set while a place in the chain is waiting to be filled — the panel is picking
   * the next node rather than dropping a loose one. Narrows the catalog to nodes
   * that can actually join a flow.
   */
  insertMode?: boolean;
};

/*
 * The catalog side of the canvas: search, browse and add. It renders whatever
 * `NODE_CATALOG` holds, so a new node type shows up here on its own — groups
 * with nothing in them stay hidden instead of leaving empty headings behind.
 */
export function NodesPanel({ onAdd, onClose, insertMode = false }: NodesPanelProps) {
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () =>
      NODE_GROUPS.map((group) => ({
        ...group,
        items: NODE_CATALOG.filter(
          (item) =>
            item.group === group.key &&
            matchesQuery(item, query) &&
            (!insertMode || item.connectable),
        ),
      })).filter((group) => group.items.length > 0),
    [insertMode, query],
  );

  return (
    <aside aria-label="Nodes" className="flex h-full min-w-0 flex-col border-l bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
        <h2 className="text-sm font-semibold tracking-tight">Nodes</h2>
        <Button
          aria-label="Close nodes panel"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>

      <div className="flex shrink-0 flex-col gap-2 px-3 py-3">
        {/* Says why the list is shorter than usual, so the missing note isn't a bug. */}
        {insertMode && (
          <p className="px-1 text-[11px] text-brand">
            Choose the node to place here. Notes can’t join a flow.
          </p>
        )}
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            // Opening the panel puts the caret in search, so the keyboard path
            // is type-then-enter rather than reach-for-the-mouse.
            autoFocus
            aria-label="Search nodes"
            placeholder="Search nodes…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              // Escape clears a search first; only an empty field closes the
              // panel. stopPropagation keeps the canvas from also reacting.
              event.stopPropagation();
              if (query) setQuery("");
              else onClose();
            }}
          />
        </InputGroup>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-[13px] text-muted-foreground">
            No nodes match “{query}”.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="mb-4 last:mb-0">
              <h3 className="px-1 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.key}>
                    <NodesPanelItem item={item} onAdd={onAdd} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {!query && (
          <p className="px-1 pt-2 text-[11px] text-muted-foreground">More nodes are coming soon.</p>
        )}
      </div>
    </aside>
  );
}

function NodesPanelItem({
  item,
  onAdd,
}: { item: NodeCatalogItem } & Pick<NodesPanelProps, "onAdd">) {
  const { Icon } = item;

  return (
    <button
      type="button"
      draggable
      title="Click to add, or drag onto the canvas"
      className="group flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
      onClick={() => onAdd(item)}
      onDragStart={(event) => {
        /*
         * A private MIME type rather than text/plain: the canvas can tell a node
         * being dragged in from arbitrary text dropped on it.
         */
        event.dataTransfer.setData(NODE_DRAG_MIME, item.key);
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors group-hover:border-brand/40 group-hover:text-brand">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{item.label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{item.description}</span>
      </span>
    </button>
  );
}
