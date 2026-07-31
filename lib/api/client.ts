/**
 * HTTP mechanics for talking to Spring Boot: base URL, headers, error parsing.
 * No business logic, no cookies — only the service layer may import this.
 *
 * This module is server-only by construction. SPRING_API_URL carries no
 * NEXT_PUBLIC_ prefix, so if it ever gets bundled into the browser the base URL
 * resolves to undefined and every call throws instead of silently leaking.
 */

/** Error carrying the backend's message and HTTP status. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  /** JSON-serializable request body (sent as application/json). */
  json?: unknown;
  /** Multipart body, for the file upload endpoint. Mutually exclusive with `json`. */
  form?: FormData;
  /** Bearer token for authenticated endpoints; Route Handlers supply it. */
  token?: string;
};

function baseUrl(): string {
  const url = process.env.SPRING_API_URL;
  if (!url) {
    throw new Error(
      "SPRING_API_URL is not set. It is a server-only variable — do not add a " +
        "NEXT_PUBLIC_ prefix, and do not call apiClient from the browser.",
    );
  }
  return url.replace(/\/$/, "");
}

/**
 * Pull the most useful message out of a non-2xx response.
 *
 * `message` is preferred over `error` because Spring answers with both, and `error`
 * only ever holds the HTTP reason phrase: `{"status":400,"error":"Bad Request",
 * "message":"message must be at most 2000 characters"}`. Reading `error` first turned
 * every backend failure in the app into "Bad Request" or "Unauthorized" — including
 * "Invalid email or password" on the login form.
 *
 * `error` is still the fallback, for any endpoint that answers with a bare
 * `{"error":"..."}` instead. Blank values are skipped rather than accepted, since
 * Spring can be configured to send `"message":""`.
 */
async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const detail = [data?.message, data?.error].find(
      (value) => typeof value === "string" && value.trim(),
    );
    return detail ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** Spring answers 204 and empty bodies on some endpoints, so never bare .json(). */
async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { json, form, token, headers, ...rest } = options;

  if (json !== undefined && form !== undefined) {
    throw new Error("apiClient: pass either `json` or `form`, not both.");
  }

  const finalHeaders = new Headers(headers);
  if (json !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`);

  /*
   * A FormData body is passed through untouched and deliberately carries no
   * Content-Type: fetch has to generate the multipart boundary itself, and
   * setting the header by hand omits it, which Spring rejects.
   */
  const res = await fetch(`${baseUrl()}${endpoint}`, {
    ...rest,
    headers: finalHeaders,
    body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
  });

  if (!res.ok) {
    throw new ApiError(await readError(res), res.status);
  }
  return parseBody<T>(res);
}
