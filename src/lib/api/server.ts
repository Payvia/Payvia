import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "@/lib/env";
import { createApi } from "./client";
import { createLiveApi } from "./live/client";
import { isApiError } from "./errors";
import { handleMockRequest } from "./mock/handler";
import { getMockStore } from "./mock/instance";
import type { Merchant } from "./schemas";
import { ACCESS_COOKIE, SESSION_COOKIE } from "./session";

const live = { appUrl: env.appUrl, network: env.stellarNetwork };

/**
 * In mock mode the "backend" lives in this process, so Server Components call
 * it directly instead of making an HTTP request back to their own server.
 */
function mockFetch(session: string | null): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input), "http://mock");
    const result = handleMockRequest(getMockStore(), {
      method: init?.method ?? "GET",
      path: url.pathname.split("/").filter(Boolean),
      query: url.searchParams,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
      session,
    });
    return Response.json(result.body, { status: result.status });
  };
}

/** API client for Server Components, acting as the current visitor. */
export async function serverApi() {
  const cookieStore = await cookies();

  if (env.apiMode === "mock") {
    return createApi({
      baseUrl: "",
      fetch: mockFetch(cookieStore.get(SESSION_COOKIE)?.value ?? null),
    });
  }

  // The server reaches the backend directly with the visitor's access token.
  // It never refreshes an expired one: refresh tokens are single-use and a
  // Server Component cannot store the replacement. The browser does that.
  const access = cookieStore.get(ACCESS_COOKIE)?.value;
  return createLiveApi({
    ...live,
    baseUrl: env.apiUrl!,
    headers: (): HeadersInit =>
      access ? { Authorization: `Bearer ${access}` } : {},
  });
}

/**
 * API client for public data (customer payment pages, link previews). Reads
 * no cookies, so it never ties a public page to a visitor's session.
 */
export function publicServerApi() {
  return env.apiMode === "mock"
    ? createApi({ baseUrl: "", fetch: mockFetch(null) })
    : createLiveApi({ ...live, baseUrl: env.apiUrl! });
}

/**
 * The signed-in merchant, or null. Deduplicated within a request. Mock mode
 * only: against the live backend the merchant is loaded in the browser, which
 * owns the session there (see MerchantProvider).
 */
export const getMerchant = cache(async (): Promise<Merchant | null> => {
  const api = await serverApi();
  try {
    return await api.auth.me();
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null;
    throw error;
  }
});
