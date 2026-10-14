import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { handleMockRequest } from "@/lib/api/mock/handler";
import { getMockStore } from "@/lib/api/mock/instance";
import { SESSION_COOKIE } from "@/lib/api/session";
import { env } from "@/lib/env";

// Development stand-in for the PayVia backend. See lib/api/mock.

async function handle(
  request: NextRequest,
  { params }: RouteContext<"/api/mock/[...path]">,
) {
  if (env.apiMode !== "mock") {
    return NextResponse.json(
      { error: { code: "not_found", message: "Endpoint not found." } },
      { status: 404 },
    );
  }

  const { path } = await params;
  const cookieStore = await cookies();
  const body =
    request.method === "GET" ? null : await request.json().catch(() => null);

  const result = handleMockRequest(getMockStore(), {
    method: request.method,
    path,
    query: request.nextUrl.searchParams,
    body,
    session: cookieStore.get(SESSION_COOKIE)?.value ?? null,
  });

  if (result.session) {
    cookieStore.set(SESSION_COOKIE, result.session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } else if (result.session === null) {
    cookieStore.delete(SESSION_COOKIE);
  }

  return NextResponse.json(result.body, { status: result.status });
}

export { handle as GET, handle as POST, handle as PATCH };
