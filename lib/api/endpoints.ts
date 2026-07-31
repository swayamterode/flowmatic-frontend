/**
 * Every Spring Boot path in one place — no endpoint string is allowed to appear
 * anywhere else. These are backend paths consumed by the service layer, not the
 * Next.js Route Handler paths the browser calls.
 */
export const ENDPOINTS = {
  AUTH: {
    REGISTER: "/api/auth/register",
    VERIFY_EMAIL: "/api/auth/verify-email",
    RESEND_OTP: "/api/auth/resend-otp",
    LOGIN: "/api/auth/login",
    REFRESH: "/api/auth/refresh-token",
  },
  UPLOADS: {
    CREATE: "/api/uploads",
  },
  WORKFLOWS: {
    LIST: "/api/workflows",
    CREATE: "/api/workflows",
    // A function rather than a template at the call site, so the one path with a
    // parameter in it is still written down exactly once.
    byId: (id: number | string) => `/api/workflows/${id}`,
    /** Enqueues a run. Answers 202 with a PENDING run, it does not execute one. */
    run: (id: number | string) => `/api/workflows/${id}/run`,
  },
  RUNS: {
    // Note the shape: runs hang off /api/workflows, not a top-level /api/runs.
    byId: (runId: number | string) => `/api/workflows/runs/${runId}`,
    /** Sends every message an OUTPUT node held for manual review. Answers the updated node. */
    sendNode: (runId: number | string, nodeId: string) =>
      `/api/workflows/runs/${runId}/nodes/${encodeURIComponent(nodeId)}/send`,
  },
  AI: {
    /** Rewrites a rough instruction into a clean prompt. Answers `{ prompt }`. */
    META_PROMPT: "/api/ai/meta-prompt",
  },
  // add new modules here, grouped by domain
} as const;
