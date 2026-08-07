"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { getRoute } from "@/lib/api/route-client";
import type { WorkflowUsage } from "@/types/usage.types";

/**
 * The signed-in user's lifetime run usage, shared by the header pill and the
 * run-blocked banner so both read the same number and a run can invalidate it.
 *
 * Unlike SessionProvider, there's nothing to seed this with from the server —
 * usage changes on every run, so it fetches once on mount instead.
 */
type WorkflowUsageValue = {
  usage: WorkflowUsage | null;
  loading: boolean;
  refresh: () => void;
};

const WorkflowUsageContext = createContext<WorkflowUsageValue | null>(null);

export function WorkflowUsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<WorkflowUsage | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped by every fetch, so a slow call that resolves after a newer one has
  // already landed can't clobber it with stale data.
  const ticket = useRef(0);

  const refresh = useCallback(() => {
    const mine = ++ticket.current;
    void getRoute<WorkflowUsage>("/api/workflows/runs/usage")
      .then((next) => {
        if (mine === ticket.current) setUsage(next);
      })
      .catch(() => {
        // Leaves the last-known usage on screen rather than blanking a
        // working pill over a transient network hiccup.
      })
      .finally(() => {
        if (mine === ticket.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <WorkflowUsageContext.Provider value={{ usage, loading, refresh }}>
      {children}
    </WorkflowUsageContext.Provider>
  );
}

/**
 * The signed-in user's usage snapshot. Throws outside the provider — a
 * component that needs this and has none to show is a wiring mistake, not a
 * state to render around (mirrors useSessionUser in session-provider.tsx).
 */
export function useWorkflowUsage(): WorkflowUsageValue {
  const value = useContext(WorkflowUsageContext);

  if (!value) {
    throw new Error("useWorkflowUsage must be used inside a WorkflowUsageProvider.");
  }
  return value;
}
