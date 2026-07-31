/**
 * Request/response shapes for the uploads module, taken verbatim from the
 * backend contract in FRONTEND_CONTEXT.md §3.
 *
 * The request is multipart rather than JSON, so it has no interface here — the
 * file goes on a FormData under the field name `file`.
 */

/** Returned by POST /api/uploads. `uploadId` is what a DATA_SOURCE node references. */
export interface UploadResponse {
  uploadId: string;
  filename: string;
  size: number;
}
