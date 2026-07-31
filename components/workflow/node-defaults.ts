/*
 * The primitives every node module needs: fresh ids, and the two layers the canvas
 * stacks things on.
 *
 * Extracted from `node-catalog` because the catalog is no longer the only thing that
 * mints a node. The AI card's chat-model slot attaches one itself, and importing the
 * catalog to do that would close a cycle — `node-catalog` → `nodes/ai-node` → the
 * slot → back to `node-catalog`. Nothing here imports a component, so both sides can
 * reach it freely.
 */

/** Notes sit behind nodes, so a note can be used as a backdrop for a group of them. */
export const NOTE_Z_INDEX = 0;
export const NODE_Z_INDEX = 1;

const counters = new Map<string, number>();

export function nextId(prefix: string) {
  const next = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, next);
  return `${prefix}-${next}`;
}

const SUFFIXED_ID = /^(.*)-(\d+)$/;

export function seedNodeIds(ids: Iterable<string>) {
  for (const id of ids) {
    const match = SUFFIXED_ID.exec(id);
    if (!match) continue;
    const [, prefix, number] = match;
    counters.set(prefix, Math.max(counters.get(prefix) ?? 0, Number(number)));
  }
}
