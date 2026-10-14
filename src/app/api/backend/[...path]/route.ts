import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  handleGatewayRequest,
  type GatewayResponse,
} from "@/lib/api/live/gateway";
import { ACCESS_COOKIE, SESSION_COOKIE } from "@/lib/api/session";
import { env } from "@/lib/env";

// Same-origin gateway to the PayVia backend. See lib/api/live/gateway.ts.

const fail = (status: number, code: string, message: string) =>
  NextResponse.json(
    { error: { code, message, details: {}, requestId: "" } },
    { status },
  );

/** A page on another site must not be able to act with this app's cookies. */
function crossSite(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || request.method === "GET") return false;
  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

async function handle(
  request: NextRequest,
  { params }: RouteContext<"/api/backend/[...path]">,
) {
  if (env.apiMode !== "live") {
    return fail(404, "NOT_FOUND", "Endpoint not found.");
  }
  if (crossSite(request)) {
    return fail(403, "FORBIDDEN", "This request is not allowed.");
  }

  const { path } = await params;
  const cookieStore = await cookies();
  const body = request.method === "GET" ? "" : await request.text();

  const result = await handleGatewayRequest(
    {
      method: request.method,
      path,
      search: request.nextUrl.search,
      body: body || null,
      idempotencyKey: request.headers.get("idempotency-key"),
      forwardedFor: request.headers.get("x-forwarded-for"),
      session: cookieStore.get(SESSION_COOKIE)?.value ?? null,
      access: cookieStore.get(ACCESS_COOKIE)?.value ?? null,
    },
    { apiUrl: env.apiUrl! },
  );

  const apply = (name: string, change: GatewayResponse["session"]) => {
    if (change === undefined) return;
    if (change === null) return void cookieStore.delete(name);
    cookieStore.set(name, change.value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: change.maxAge,
    });
  };
  apply(SESSION_COOKIE, result.session);
  apply(ACCESS_COOKIE, result.access);

  if (result.file) {
    return new NextResponse(result.file.text, {
      status: result.status,
      headers: { "Content-Type": result.file.contentType },
    });
  }

  return result.body === null
    ? new NextResponse(null, { status: result.status })
    : NextResponse.json(result.body, { status: result.status });
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
