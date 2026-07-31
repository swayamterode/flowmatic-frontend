"use client";

import { createContext, useContext } from "react";

/*
 * Where the next node picked from the panel should go. Set by an edge's `+` or a
 * node's `+` tail, read by the canvas when the panel reports a choice.
 */
export type InsertTarget =
  { kind: "edge"; edgeId: string } | { kind: "append"; nodeId: string; handleId: string | null };

/*
 * A context rather than the callback-through-`data` convention the node components
 * use: edges and nodes raise the same one request, and threading it through edge
 * `data` *and* a per-type case in the canvas's `renderedNodes` switch would be the
 * same wiring written twice — plus a new case for every future node type that wants
 * a tail. Here a node asks "insert after me" and the canvas never learns what kind
 * of node asked.
 */
const InsertTargetContext = createContext<((target: InsertTarget) => void) | null>(null);

export const InsertTargetProvider = InsertTargetContext.Provider;

export function useRequestInsert() {
  const requestInsert = useContext(InsertTargetContext);
  if (!requestInsert) {
    throw new Error("useRequestInsert must be used inside an InsertTargetProvider");
  }
  return requestInsert;
}
