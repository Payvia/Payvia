import { beforeEach, describe, expect, it } from "vitest";
import { merchantSchema, paymentListSchema } from "../schemas";
import { handleMockRequest, type MockRequest } from "./handler";
import { DEMO_LOGIN, DEMO_MERCHANT_WALLET } from "./seed";
import { MockStore } from "./store";

let store: MockStore;

const call = (
  method: string,
  url: string,
  options: { body?: unknown; session?: string | null } = {},
) => {
  const { pathname, searchParams } = new URL(url, "http://mock");
  const req: MockRequest = {
    method,
    path: pathname.split("/").filter(Boolean),
    query: searchParams,
    body: options.body ?? null,
    session: options.session ?? null,
  };
  return handleMockRequest(store, req);
};

beforeEach(() => {
  store = new MockStore({ appUrl: "https://payvia.app" });
});

describe("mock API routes", () => {
  it("starts a session on login and ends it on logout", () => {
    const login = call("POST", "/auth/login", { body: DEMO_LOGIN });
    expect(login.status).toBe(200);
    expect(login.session).toBe("m_demo");
    merchantSchema.parse(login.body);
    expect(call("POST", "/auth/logout").session).toBeNull();
  });

  it("requires a session for merchant endpoints", () => {
    expect(call("GET", "/me").status).toBe(401);
    expect(call("GET", "/payments").status).toBe(401);
    expect(call("GET", "/me", { session: "m_demo" }).status).toBe(200);
  });

  it("serves public payment pages without a session", () => {
    expect(call("GET", "/public/payments/8Xk92Lm").status).toBe(200);
    expect(call("GET", "/public/payments/nope").status).toBe(404);
  });

  it("applies list filters from the query string", () => {
    const res = call("GET", "/payments?status=CANCELLED&q=john", {
      session: "m_demo",
    });
    expect(paymentListSchema.parse(res.body).items).toHaveLength(1);
  });

  it("returns field messages for invalid input", () => {
    const res = call("POST", "/payments", {
      session: "m_demo",
      body: {
        amount: "0",
        asset: "USDC",
        description: "x",
        expiry: "NONE",
        recipient_wallet: DEMO_MERCHANT_WALLET,
      },
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "invalid_request",
        message: "Enter an amount to continue.",
      },
    });
  });

  it("creates, reads and cancels a request", () => {
    const created = call("POST", "/payments", {
      session: "m_demo",
      body: {
        amount: "100",
        asset: "USDC",
        description: "Deposit",
        expiry: "24H",
        recipient_wallet: DEMO_MERCHANT_WALLET,
      },
    });
    expect(created.status).toBe(201);
    const id = (created.body as { payment_id: string }).payment_id;
    expect(call("GET", `/payments/${id}`, { session: "m_demo" }).status).toBe(
      200,
    );
    expect(
      call("POST", `/payments/${id}/cancel`, { session: "m_demo" }).body,
    ).toMatchObject({ status: "CANCELLED" });
  });

  it("404s unknown endpoints", () => {
    expect(call("DELETE", "/payments/x", { session: "m_demo" }).status).toBe(
      404,
    );
  });
});

describe("errors from another copy of the module", () => {
  it("are still turned into responses", () => {
    // Server bundles each load their own ApiError class; the shared store may
    // throw one this module has never seen.
    class ApiError extends Error {
      code = "not_found";
      status = 404;
      name = "ApiError";
    }
    const foreign = {
      getPublic() {
        throw new ApiError("Payment request not found.");
      },
    } as unknown as MockStore;

    const res = handleMockRequest(foreign, {
      method: "GET",
      path: ["public", "payments", "x"],
      query: new URLSearchParams(),
      body: null,
      session: null,
    });
    expect(res).toEqual({
      status: 404,
      body: {
        error: { code: "not_found", message: "Payment request not found." },
      },
    });
  });
});
