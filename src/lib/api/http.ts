import { z } from "zod";
import { ApiError } from "./errors";
import { apiErrorSchema } from "./schemas";

export type TransportOptions = {
  /** "/api/mock" or "/api/backend" in the browser, the backend origin on the server. */
  baseUrl: string;
  /** Extra headers, used on the server to act as the current visitor. */
  headers?: () => Promise<HeadersInit> | HeadersInit;
  /** Replaces the network call. Used to reach the mock API in-process. */
  fetch?: typeof fetch;
  /** Turns an error response into an ApiError. */
  toError?: (status: number, json: unknown) => ApiError;
  /**
   * Called once when a request is rejected as signed out. Resolve true after
   * restoring the session to have the request sent again.
   */
  recover?: () => Promise<boolean>;
};

export type RequestInit = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Read a successful response as text (a CSV file) instead of JSON. */
  text?: boolean;
};

function defaultError(status: number, json: unknown) {
  const parsed = apiErrorSchema.safeParse(json);
  return new ApiError(
    parsed.success ? parsed.data.error.code : "unknown_error",
    parsed.success
      ? parsed.data.error.message
      : "Something went wrong. Please try again.",
    status,
    { details: parsed.success ? parsed.data.error.details : undefined },
  );
}

/**
 * JSON over fetch, shared by the mock and live clients. Every response is
 * parsed, so a contract mismatch fails here rather than deep in the UI.
 */
export function createTransport({
  baseUrl,
  headers,
  fetch: send = fetch,
  toError = defaultError,
  recover,
}: TransportOptions) {
  return async function request<T>(
    schema: z.ZodType<T>,
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await send(`${baseUrl}${path}`, {
          method: init.method ?? "GET",
          credentials: "include",
          cache: "no-store",
          signal: init.signal,
          headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
            ...(await headers?.()),
          },
          body: init.body ? JSON.stringify(init.body) : undefined,
        });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          throw cause;
        }
        throw new ApiError(
          "network_error",
          "We could not reach PayVia. Check your connection and try again.",
          0,
          // Keep the underlying failure for server logs and debugging.
          { cause },
        );
      }

      if (response.ok && init.text) return schema.parse(await response.text());
      const json: unknown = await response.json().catch(() => null);
      if (response.ok) return schema.parse(json);

      const error = toError(response.status, json);
      const signedOut = error.status === 401 && error.code === "unauthorized";
      if (signedOut && attempt === 0 && recover && (await recover())) continue;
      throw error;
    }
  };
}
