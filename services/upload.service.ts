import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { UploadResponse } from "@/types/upload.types";

/**
 * The CSV upload call against Spring Boot. The field name `file` is the whole
 * contract on the request side (FRONTEND_CONTEXT.md §3) — the backend reads
 * exactly that part and 400s without it — so building the FormData belongs here
 * rather than in the Route Handler above.
 */
export const uploadService = {
  create(file: File, token: string) {
    const form = new FormData();
    form.append("file", file, file.name);

    return apiClient<UploadResponse>(ENDPOINTS.UPLOADS.CREATE, {
      method: "POST",
      form,
      token,
    });
  },
};
