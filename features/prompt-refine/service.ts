import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { MetaPromptRequest, MetaPromptResponse } from "@/features/prompt-refine/types";

export const promptRefineService = {
  metaPrompt(payload: MetaPromptRequest, token: string) {
    return apiClient<MetaPromptResponse>(ENDPOINTS.AI.META_PROMPT, {
      method: "POST",
      json: payload,
      token,
    });
  },
};
