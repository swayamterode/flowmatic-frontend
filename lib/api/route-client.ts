/**
 * The browser half of the BFF hop: UI components call their own Next.js Route
 * Handlers through this and nothing else. It is the client-safe counterpart to
 * client.ts (server-only, Spring-facing) and deliberately knows nothing about
 * base URLs, tokens or headers beyond Content-Type.
 */

/** Error carrying a Route Handler's sanitized message and HTTP status. */
export class RouteError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

async function readJson(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  return res.json().catch(() => undefined);
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = await readJson(res);

  if (!res.ok) {
    const message = (data as { error?: string } | undefined)?.error;
    throw new RouteError(message ?? "Something went wrong.", res.status);
  }
  return data as T;
}

function withJson(method: string, body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  };
}

/** `signal` lets a caller abandon a poll whose answer nobody is waiting for any more. */
export function getRoute<T = unknown>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: "GET", signal });
}

export function postRoute<T = unknown>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, withJson("POST", body));
}

export function putRoute<T = unknown>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, withJson("PUT", body));
}

export function deleteRoute<T = unknown>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

/**
 * Multipart POST, for file uploads. No Content-Type header on purpose — the
 * browser has to generate the multipart boundary, and naming the type by hand
 * omits it.
 *
 * `signal` lets a caller abandon an upload whose result nobody is waiting for
 * any more.
 */
export function postFormRoute<T = unknown>(
  path: string,
  form: FormData,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, { method: "POST", body: form, signal });
}
