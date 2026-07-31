"use client";

import { createContext, useContext } from "react";

/*
 * "Open the config panel for this node."
 *
 * A context for the same reason `insert-target.tsx` is one: threading an `onEdit`
 * through node `data` would add a case to the canvas's `renderedNodes` switch for
 * every node type that grows a config panel — FILTER, OUTPUT and CONDITION all
 * will. Here a node asks to be opened and the canvas never learns what kind of node
 * asked. It also keeps injected functions out of node data, which the graph
 * serializer would otherwise have to know to leave behind.
 */
const EditorTargetContext = createContext<((nodeId: string) => void) | null>(null);

export const EditorTargetProvider = EditorTargetContext.Provider;

export function useRequestEditor() {
  const requestEditor = useContext(EditorTargetContext);
  if (!requestEditor) {
    throw new Error("useRequestEditor must be used inside an EditorTargetProvider");
  }
  return requestEditor;
}
