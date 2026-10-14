import { routes } from "@/lib/routes";
import { ApiError } from "../errors";
import { GATEWAY_PATH } from "./paths";

// Browser side of the session. The gateway answers 401 once the short-lived
// access token has lapsed; the page then asks it for a new one and repeats
// the request.

type Outcome = "ok" | "expired" | "error";

async function requestRefresh(): Promise<Outcome> {
  try {
    const response = await fetch(`${GATEWAY_PATH}/v1/auth/refresh`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.ok) return "ok";
    return response.status === 401 ? "expired" : "error";
  } catch {
    return "error";
  }
}

let pending: Promise<Outcome> | null = null;

/**
 * Refresh tokens are single-use, so only one refresh may run at a time: one
 * per tab through `pending`, and one across tabs through a Web Lock. A tab
 * that waited finds the new cookies already set and the gateway does nothing.
 */
function refresh(): Promise<Outcome> {
  pending ??= (async () => {
    try {
      return navigator.locks
        ? await navigator.locks.request(
            "payvia-session-refresh",
            requestRefresh,
          )
        : await requestRefresh();
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/**
 * Restores the session after a 401. Resolves true if the request can be
 * retried, false if the session is over. Throws when that could not be found
 * out: the visitor may well still be signed in, so they must not be sent to
 * log in, where the session cookie would only send them straight back.
 */
export async function recoverSession(): Promise<boolean> {
  const outcome = await refresh();
  if (outcome === "error") {
    throw new ApiError(
      "session_unavailable",
      "We could not reach PayVia to check your session. Please try again.",
      503,
    );
  }
  if (outcome === "expired") {
    // Full page load so no cached data or routes outlive the session. The
    // gateway has cleared the cookies, so the login page stays put.
    window.location.assign(routes.login);
  }
  return outcome === "ok";
}
