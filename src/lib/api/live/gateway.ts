// The browser never talks to the PayVia backend directly. It calls this
// gateway on the app's own origin (app/api/backend), which forwards the
// request and keeps the backend's tokens in first-party httpOnly cookies.
//
// Why: the backend sets its refresh cookie for its own domain. From a page on
// another site that is a third-party cookie, which Safari and private windows
// drop, and which this app's server could never read to protect its routes.

/** Name of the refresh cookie the backend sets on login, register and refresh. */
const BACKEND_REFRESH_COOKIE = "payvia_refresh";
const FOURTEEN_DAYS = 14 * 24 * 60 * 60;
/** Let the access cookie lapse slightly before the token does. */
const ACCESS_SKEW_SECONDS = 30;

export type GatewayRequest = {
  method: string;
  /** Path segments after /api/backend: ["v1", "me"]. */
  path: string[];
  /** Query string including "?", or "". */
  search: string;
  /** Raw JSON body, if any. */
  body: string | null;
  idempotencyKey: string | null;
  /** The caller's address chain, passed on for the backend's rate limiting. */
  forwardedFor: string | null;
  /** Refresh token from the session cookie. */
  session: string | null;
  /** Access token from the access cookie. */
  access: string | null;
};

type CookieChange = { value: string; maxAge: number } | null;

export type GatewayResponse = {
  status: number;
  body: unknown;
  /** A non-JSON body (the CSV export), passed through as it came. */
  file?: { text: string; contentType: string };
  /** Cookies to set (or, with null, clear). Absent means leave as is. */
  session?: CookieChange;
  access?: CookieChange;
};

export type GatewayOptions = { apiUrl: string; fetch?: typeof fetch };

type Tokens = { session: CookieChange; access: CookieChange };
type RefreshResult =
  ({ ok: true } & Tokens) | { ok: false; status: number; body: unknown };

const error = (status: number, code: string, message: string) => ({
  status,
  body: { error: { code, message, details: {}, requestId: "" } },
});

const signedOut = () => error(401, "UNAUTHORIZED", "Log in to continue.");

const unreachable = () =>
  error(
    502,
    "SERVICE_UNAVAILABLE",
    "We could not reach PayVia. Please try again in a moment.",
  );

function refreshCookie(response: Response): CookieChange | undefined {
  for (const cookie of response.headers.getSetCookie()) {
    const match = cookie.match(/^payvia_refresh=([^;]*)/);
    if (!match) continue;
    const maxAge = Number(cookie.match(/;\s*max-age=(\d+)/i)?.[1]);
    return {
      value: decodeURIComponent(match[1]),
      maxAge: Number.isFinite(maxAge) ? maxAge : FOURTEEN_DAYS,
    };
  }
  return undefined;
}

/** Reads the tokens out of a login, register or refresh response. */
function tokensFrom(response: Response, json: unknown): Tokens | null {
  const { accessToken, expiresIn } = (json ?? {}) as {
    accessToken?: unknown;
    expiresIn?: unknown;
  };
  const session = refreshCookie(response);
  if (typeof accessToken !== "string" || !session) return null;
  const lifetime = typeof expiresIn === "number" ? expiresIn : 900;
  return {
    session,
    access: {
      value: accessToken,
      maxAge: Math.max(lifetime - ACCESS_SKEW_SECONDS, 1),
    },
  };
}

/** Reached from an email link with a one-time token, signed in or not. */
const tokenRoutes = new Set([
  "POST /v1/auth/verify-email",
  "POST /v1/auth/forgot-password",
  "POST /v1/auth/reset-password",
  "POST /v1/auth/confirm-email-change",
]);

/** A success on these ends every session the merchant has. */
const sessionEndingRoutes = new Set([
  "POST /v1/auth/logout-all",
  "POST /v1/auth/reset-password",
  "POST /v1/auth/confirm-email-change",
  "DELETE /v1/me",
]);

// Refresh tokens rotate, and the backend treats a second use of one as theft
// and ends the session. Requests arriving together with the same token share
// one refresh, and its result is kept briefly for stragglers.
const refreshes = new Map<
  string,
  { at: number; result: Promise<RefreshResult> }
>();
const REFRESH_MEMO_MS = 10_000;

export async function handleGatewayRequest(
  req: GatewayRequest,
  { apiUrl, fetch: send = fetch }: GatewayOptions,
): Promise<GatewayResponse> {
  const base = apiUrl.replace(/\/$/, "");
  const route = `${req.method} /${req.path.join("/")}`;

  async function upstream(
    path: string,
    init: { method: string; body?: string | null; headers?: HeadersInit },
  ) {
    const response = await send(`${base}${path}`, {
      method: init.method,
      cache: "no-store",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(req.forwardedFor ? { "X-Forwarded-For": req.forwardedFor } : {}),
        ...init.headers,
      },
      body: init.body ?? undefined,
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Not JSON: a file, kept as text below.
    }
    return { response, json, text };
  }

  function refresh(token: string): Promise<RefreshResult> {
    const now = Date.now();
    for (const [key, entry] of refreshes) {
      if (now - entry.at > REFRESH_MEMO_MS) refreshes.delete(key);
    }
    const known = refreshes.get(token);
    if (known) return known.result;

    const result = upstream("/v1/auth/refresh", {
      method: "POST",
      headers: { Cookie: `${BACKEND_REFRESH_COOKIE}=${token}` },
    }).then(({ response, json }): RefreshResult => {
      const tokens = response.ok ? tokensFrom(response, json) : null;
      if (tokens) return { ok: true, ...tokens };
      return response.ok
        ? { ok: false, ...unreachable() }
        : { ok: false, status: response.status, body: json };
    });
    refreshes.set(token, { at: now, result });
    // Only a verdict is worth remembering; an outage may be tried again.
    result
      .then((outcome) => outcome.ok || outcome.status === 401)
      .catch(() => false)
      .then((settled) => settled || refreshes.delete(token));
    return result;
  }

  try {
    if (req.path[0] !== "v1") {
      return error(404, "NOT_FOUND", "Endpoint not found.");
    }

    switch (route) {
      case "POST /v1/auth/login":
      case "POST /v1/auth/register": {
        const { response, json } = await upstream(`/${req.path.join("/")}`, {
          method: "POST",
          body: req.body,
        });
        if (!response.ok) return { status: response.status, body: json };
        const tokens = tokensFrom(response, json);
        if (!tokens) return unreachable();
        // The tokens stay in cookies; the page only needs the merchant.
        const { merchant } = json as { merchant: unknown };
        return { status: response.status, body: { merchant }, ...tokens };
      }

      case "POST /v1/auth/refresh": {
        // Another tab already refreshed: its new cookies came with this call.
        if (req.access) return { status: 204, body: null };
        if (!req.session) return { ...signedOut(), session: null };
        const result = await refresh(req.session);
        if (result.ok) {
          return {
            status: 204,
            body: null,
            session: result.session,
            access: result.access,
          };
        }
        // Only a definite "no" ends the session; an outage must not.
        return result.status === 401
          ? { ...signedOut(), session: null, access: null }
          : { status: result.status, body: result.body };
      }

      case "POST /v1/auth/logout": {
        if (req.session) {
          // Best effort: the cookies are cleared either way.
          await upstream("/v1/auth/logout", {
            method: "POST",
            headers: { Cookie: `${BACKEND_REFRESH_COOKIE}=${req.session}` },
          }).catch(() => undefined);
        }
        return { status: 204, body: null, session: null, access: null };
      }
    }

    const isPublic =
      req.path[1] === "public" ||
      req.path[1] === "assets" ||
      tokenRoutes.has(route);
    const inAuth = req.path[1] === "auth";
    // Without an access token the page refreshes the session and asks again.
    if (!isPublic && !req.access) return signedOut();

    const { response, json, text } = await upstream(
      `/${req.path.map(encodeURIComponent).join("/")}${req.search}`,
      {
        method: req.method,
        body: req.body,
        headers: {
          ...(!isPublic ? { Authorization: `Bearer ${req.access}` } : {}),
          // The backend scopes its refresh cookie to /v1/auth.
          ...(inAuth && req.session
            ? { Cookie: `${BACKEND_REFRESH_COOKIE}=${req.session}` }
            : {}),
          ...(req.idempotencyKey
            ? { "Idempotency-Key": req.idempotencyKey }
            : {}),
        },
      },
    );
    if (response.ok && sessionEndingRoutes.has(route)) {
      // Every session of the merchant is over, this browser's included.
      return { status: 204, body: null, session: null, access: null };
    }
    if (response.ok && route === "POST /v1/me/password") {
      // The other sessions ended; this one continues on the new tokens, which
      // stay in cookies like the ones from login.
      const { accessToken, expiresIn } = (json ?? {}) as {
        accessToken?: unknown;
        expiresIn?: unknown;
      };
      const session = refreshCookie(response);
      return {
        status: 204,
        body: null,
        ...(session ? { session } : {}),
        ...(typeof accessToken === "string"
          ? {
              access: {
                value: accessToken,
                maxAge: Math.max(
                  (typeof expiresIn === "number" ? expiresIn : 900) -
                    ACCESS_SKEW_SECONDS,
                  1,
                ),
              },
            }
          : {}),
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    return {
      status: response.status,
      body: json,
      ...(response.ok && text && !contentType.includes("json")
        ? { file: { text, contentType: contentType || "text/plain" } }
        : {}),
      // A rejected access token is dropped so the page's refresh goes through.
      ...(response.status === 401 && !isPublic ? { access: null } : {}),
    };
  } catch {
    return unreachable();
  }
}
