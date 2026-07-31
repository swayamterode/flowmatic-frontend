import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowDetail,
  WorkflowSummary,
} from "@/types/workflow.types";

/**
 * Workflow CRUD against Spring Boot. Every route is owned by the authenticated
 * user, so all of these take a bearer token — which the Route Handler above
 * resolves; nothing here touches cookies or headers.
 *
 * Requesting a workflow you don't own answers 404 rather than 403 (the backend
 * hides existence), so callers should treat 404 as "gone" and not distinguish.
 */
export const workflowService = {
  list(token: string) {
    return apiClient<WorkflowSummary[]>(ENDPOINTS.WORKFLOWS.LIST, { token });
  },

  get(id: number | string, token: string) {
    return apiClient<WorkflowDetail>(ENDPOINTS.WORKFLOWS.byId(id), { token });
  },

  create(payload: CreateWorkflowRequest, token: string) {
    return apiClient<WorkflowSummary>(ENDPOINTS.WORKFLOWS.CREATE, {
      method: "POST",
      json: payload,
      token,
    });
  },

  update(id: number | string, payload: UpdateWorkflowRequest, token: string) {
    return apiClient<WorkflowDetail>(ENDPOINTS.WORKFLOWS.byId(id), {
      method: "PUT",
      json: payload,
      token,
    });
  },

  remove(id: number | string, token: string) {
    return apiClient<void>(ENDPOINTS.WORKFLOWS.byId(id), {
      method: "DELETE",
      token,
    });
  },
};
