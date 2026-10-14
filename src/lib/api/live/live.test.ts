import { describe, expect, it } from "vitest";
import { ApiError } from "../errors";
import { createLiveApi } from "./client";
import { handleGatewayRequest, type GatewayRequest } from "./gateway";
import { toApiError, toCheckoutStatus } from "./map";

// Bodies below follow the examples in the backend's OpenAPI document.

const WALLET = "GCAN3W2EZ576FBHFHRRG2UDUSODNSVK67673ZP2OXUEM3PDHQDTBHPWM";
const OTHER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const ID = "6a1f0c4e-2b7d-4e8a-9c3f-5d2b1a0e9f87";
const usdc = { code: "USDC", issuer: OTHER };

const merchant = {
  id: ID,
  email: "hello@abcdigital.com",
  businessName: "ABC Digital",
  createdAt: "2026-10-10T09:00:00.000Z",
};
const wallet = (id: string, address: string, createdAt: string) => ({
  id,
  address,
  label: null,
  network: "TESTNET",
  ownershipVerifiedAt: null,
  createdAt,
});
const summaryRow = {
  id: ID,
  publicId: "8Xk92LmQp4Za",
  status: "PENDING",
  amount: "150.00",
  asset: usdc,
  description: "Website Design",
  reference: "INV-00124",
  customerName: null,
  paymentUrl: "https://payvia.app/pay/8Xk92LmQp4Za",
  createdAt: "2026-10-10T09:00:00.000Z",
  expiresAt: "2026-10-17T09:00:00.000Z",
  paidAt: null,
};
const request = {
  ...summaryRow,
  network: "TESTNET",
  walletId: "w1",
  recipientAddress: WALLET,
  customerEmail: null,
  note: null,
  dueDate: null,
  customerAddress: null,
  txHash: null,
  explorerUrl: null,
  paidAfterExpiry: false,
  cancelledAt: null,
  attempts: [],
};

type Call = { method: string; path: string; body: unknown; headers: Headers };
type Reply = { status?: number; body?: unknown; headers?: HeadersInit };

/** A backend that answers from a table of "METHOD /path" routes. */
function backend(routes: Record<string, Reply | ((call: Call) => Reply)>) {
  const calls: Call[] = [];
  const send: typeof fetch = async (input, init) => {
    const url = new URL(String(input), "http://backend");
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname + url.search,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
      headers: new Headers(init?.headers),
    };
    calls.push(call);
    const route = routes[`${call.method} ${call.path}`];
    if (!route) throw new Error(`Unexpected call: ${call.method} ${call.path}`);
    const reply = typeof route === "function" ? route(call) : route;
    const status = reply.status ?? 200;
    return new Response(
      status === 204 ? null : JSON.stringify(reply.body ?? {}),
      { status, headers: reply.headers },
    );
  };
  return { send, calls };
}

const live = (send: typeof fetch) =>
  createLiveApi({
    baseUrl: "",
    appUrl: "https://payvia.app/",
    network: "TESTNET",
    fetch: send,
  });

const failure = (code: string, details = {}) => ({
  error: { code, message: "For developers", details, requestId: "req_1" },
});

describe("live client", () => {
  it("builds the merchant from the profile and the newest wallet", async () => {
    const { send } = backend({
      "GET /v1/me": { body: merchant },
      "GET /v1/wallets": {
        body: {
          data: [
            wallet("w1", OTHER, "2026-10-01T00:00:00.000Z"),
            wallet("w2", WALLET, "2026-10-05T00:00:00.000Z"),
          ],
        },
      },
    });
    expect(await live(send).auth.me()).toEqual({
      merchant_id: ID,
      name: "ABC Digital",
      email: "hello@abcdigital.com",
      business_name: "ABC Digital",
      logo_url: null,
      recipient_wallet: WALLET,
      wallets: [OTHER, WALLET],
      network: "TESTNET",
      setup_complete: true,
      email_verified: false,
      notify_payments: true,
    });
  });

  it("registers with the name as the business name", async () => {
    const { send, calls } = backend({
      "POST /v1/auth/register": { status: 201, body: { merchant } },
    });
    const created = await live(send).auth.signup({
      name: "ABC Digital",
      email: merchant.email,
      password: "correct-horse",
      captcha_token: "turnstile-token",
    });
    expect(calls[0].body).toMatchObject({
      businessName: "ABC Digital",
      acceptTerms: true,
      captchaToken: "turnstile-token",
    });
    expect(created.recipient_wallet).toBeNull();
  });

  it("lists payments and asks for the busy statuses under Pending", async () => {
    const { send, calls } = backend({
      "GET /v1/payment-requests?status=PENDING%2CPROCESSING&limit=100": {
        body: { data: [summaryRow], nextCursor: null },
      },
    });
    const list = await live(send).payments.list({ status: "PENDING" });
    expect(calls).toHaveLength(1);
    expect(list.total).toBe(1);
    expect(list.items[0]).toMatchObject({
      payment_id: ID,
      slug: "8Xk92LmQp4Za",
      asset: "USDC",
      reference: "INV-00124",
      updated_at: summaryRow.createdAt,
    });
    expect(list.items[0].customer_name).toBeUndefined();
  });

  it("tells an empty account from an empty search", async () => {
    const { send } = backend({
      "GET /v1/payment-requests?q=nothing&limit=100": {
        body: { data: [], nextCursor: null },
      },
      "GET /v1/payment-requests?limit=1": {
        body: { data: [summaryRow], nextCursor: null },
      },
    });
    const list = await live(send).payments.list({ q: "nothing" });
    expect(list).toEqual({ items: [], total: 1 });
  });

  it("creates a request against the wallet with that address, adding it if new", async () => {
    const { send, calls } = backend({
      "GET /v1/wallets": { body: { data: [] } },
      "POST /v1/wallets": {
        status: 201,
        body: wallet("w9", WALLET, "2026-10-10T00:00:00.000Z"),
      },
      "POST /v1/payment-requests": { status: 201, body: request },
    });
    const payment = await live(send).payments.create({
      amount: "150",
      asset: "USDC",
      description: "Website Design",
      expiry: "24H",
      recipient_wallet: WALLET,
    });
    const create = calls.at(-1)!;
    expect(create.body).toMatchObject({
      amount: "150",
      assetCode: "USDC",
      walletId: "w9",
    });
    expect((create.body as { expiresAt: string }).expiresAt).toMatch(/Z$/);
    expect(create.headers.get("Idempotency-Key")).toBeTruthy();
    expect(payment.recipient_wallet).toBe(WALLET);
  });

  it("does not ask the backend about ids it could never have issued", async () => {
    const { send, calls } = backend({});
    await expect(
      live(send).payments.get("PV-0000-99999"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(live(send).checkout.get("nope")).rejects.toMatchObject({
      status: 404,
    });
    expect(calls).toHaveLength(0);
  });

  it("maps the public payment and its memo", async () => {
    const { send } = backend({
      "GET /v1/public/payment-requests/8Xk92LmQp4Za": {
        body: {
          publicId: "8Xk92LmQp4Za",
          status: "PENDING",
          merchant: { businessName: "ABC Digital" },
          amount: "150.00",
          asset: usdc,
          network: "TESTNET",
          description: "Website Design",
          reference: null,
          customerName: "John",
          recipientAddress: WALLET,
          memo: { type: "text", value: "8Xk92LmQp4Za" },
          expiresAt: "2026-10-17T10:00:00.000Z",
          paidAt: null,
          txHash: null,
          explorerUrl: null,
        },
      },
    });
    expect(await live(send).checkout.get("8Xk92LmQp4Za")).toMatchObject({
      slug: "8Xk92LmQp4Za",
      memo: "8Xk92LmQp4Za",
      merchant_name: "ABC Digital",
      payment_url: "https://payvia.app/pay/8Xk92LmQp4Za",
      recipient_wallet: WALLET,
    });
  });

  it("prepares and submits a payment", async () => {
    const hash =
      "29801b7cc4e89c89c9b3d767e5df6f1289445a88060f9a8572f51a2be543becb";
    const { send, calls } = backend({
      "POST /v1/public/payment-requests/8Xk92LmQp4Za/prepare": {
        body: {
          attemptId: ID,
          xdr: "AAAA",
          networkPassphrase: "Test SDF Network ; September 2015",
          expiresAt: "2026-10-10T09:05:00.000Z",
          fee: "0.00002",
        },
      },
      "POST /v1/public/payment-requests/8Xk92LmQp4Za/submit": {
        status: 202,
        body: {
          status: "PROCESSING",
          attempt: {
            id: ID,
            status: "SUBMITTED",
            txHash: hash,
            failureCode: null,
          },
        },
      },
    });
    const api = live(send);
    const prepared = await api.checkout.prepare("8Xk92LmQp4Za", WALLET);
    expect(prepared).toMatchObject({ attempt_id: ID, fee: "0.00002" });
    expect(calls[0].body).toEqual({ customerAddress: WALLET });

    const result = await api.checkout.submit("8Xk92LmQp4Za", {
      attempt_id: prepared.attempt_id,
      signed_xdr: "BBBB",
    });
    expect(result).toEqual({ status: "PROCESSING", transaction_hash: hash });
    expect(calls[1].body).toEqual({ attemptId: ID, signedXdr: "BBBB" });
  });

  it("retries once after the session is restored", async () => {
    let signedIn = false;
    const { send, calls } = backend({
      "GET /v1/dashboard/summary": () =>
        signedIn
          ? { body: { data: [] } }
          : { status: 401, body: failure("UNAUTHORIZED") },
    });
    const api = createLiveApi({
      baseUrl: "",
      appUrl: "https://payvia.app",
      network: "TESTNET",
      fetch: send,
      recover: async () => (signedIn = true),
    });
    expect(await api.payments.summary()).toMatchObject({
      total_requested: "0.00",
      payment_links: 0,
    });
    expect(calls).toHaveLength(2);
  });
});

describe("live client: account, email and refunds", () => {
  it("reads email verification and the notification setting", async () => {
    const { send } = backend({
      "GET /v1/me": {
        body: {
          ...merchant,
          notifyPayments: false,
          emailVerifiedAt: "2026-10-10T09:05:00.000Z",
        },
      },
      "GET /v1/wallets": { body: { data: [] } },
    });
    expect(await live(send).auth.me()).toMatchObject({
      email_verified: true,
      notify_payments: false,
      wallets: [],
    });
  });

  it("sends the account password when a wallet is added or replaced", async () => {
    const { send, calls } = backend({
      "GET /v1/me": { body: merchant },
      "GET /v1/wallets": {
        body: {
          data: [
            wallet("w1", WALLET, "2026-10-01T00:00:00.000Z"),
            wallet("w2", OTHER, "2026-10-05T00:00:00.000Z"),
          ],
        },
      },
      "DELETE /v1/wallets/w1": { status: 204 },
      "POST /v1/wallets": {
        status: 201,
        body: wallet("w3", WALLET, "2026-10-10T00:00:00.000Z"),
      },
    });
    await live(send).merchant.update({
      recipient_wallet: WALLET,
      current_password: "hunter2-hunter2",
    });
    const changes = calls.filter((call) => call.method !== "GET");
    expect(changes.map((call) => [call.method, call.body])).toEqual([
      ["DELETE", { currentPassword: "hunter2-hunter2" }],
      ["POST", { address: WALLET, currentPassword: "hunter2-hunter2" }],
    ]);
  });

  it("keeps the business name when only notifications change", async () => {
    const { send, calls } = backend({
      "GET /v1/me": { body: merchant },
      "PATCH /v1/me": { body: merchant },
      "GET /v1/wallets": { body: { data: [] } },
    });
    await live(send).merchant.update({ notify_payments: false });
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      businessName: "ABC Digital",
      notifyPayments: false,
    });
  });

  it("sends email-link tokens and new passwords in the backend's names", async () => {
    const { send, calls } = backend({
      "POST /v1/auth/verify-email": {
        body: { emailVerifiedAt: "2026-10-13T09:00:00.000Z" },
      },
      "POST /v1/auth/forgot-password": { status: 204 },
      "POST /v1/auth/reset-password": { body: {} },
      "POST /v1/me/password": { status: 204 },
      "DELETE /v1/me": { status: 204 },
    });
    const api = live(send);
    await api.auth.verifyEmail("token-token-token-token");
    await api.auth.forgotPassword({ email: merchant.email });
    await api.auth.resetPassword({
      token: "token-token-token-token",
      new_password: "a-new-password",
    });
    await api.account.changePassword({
      current_password: "old-password",
      new_password: "a-new-password",
    });
    await api.account.delete("old-password");
    expect(calls.map((call) => call.body)).toEqual([
      { token: "token-token-token-token" },
      { email: merchant.email },
      { token: "token-token-token-token", newPassword: "a-new-password" },
      { currentPassword: "old-password", newPassword: "a-new-password" },
      { currentPassword: "old-password", confirm: "DELETE" },
    ]);
  });

  it("maps what arrived on-chain and what can be refunded", async () => {
    const attempt = {
      id: "a1",
      status: "CONFIRMED",
      source: "RECONCILER",
      txHash: "ab".repeat(32),
      customerAddress: OTHER,
      amountReceived: "150.50",
      overpaidBy: "0.50",
      assetReceived: usdc,
      failureCode: null,
      explorerUrl: null,
      createdAt: "2026-10-11T09:00:00.000Z",
      confirmedAt: "2026-10-11T09:00:05.000Z",
      refundableAmount: "0.50",
      refundWarning: "SOURCE_MAY_BE_EXCHANGE",
      refunds: [],
    };
    const { send } = backend({
      [`GET /v1/payment-requests/${ID}`]: {
        body: {
          ...request,
          status: "PAID",
          overpaidBy: "0.50",
          refundableAmount: "0.50",
          note: "Thanks",
          attempts: [attempt],
        },
      },
    });
    const payment = await live(send).payments.get(ID);
    expect(payment).toMatchObject({
      overpaid_by: "0.50",
      refundable_amount: "0.50",
      note: "Thanks",
    });
    expect(payment.attempts?.[0]).toMatchObject({
      attempt_id: "a1",
      amount_received: "150.50",
      asset_received: "USDC",
      refundable_amount: "0.50",
      payer_may_be_exchange: true,
      refunds: [],
    });
  });

  it("prepares, submits and records refunds", async () => {
    const refund = {
      id: "r1",
      status: "CONFIRMED",
      source: "API",
      amount: "0.50",
      destination: OTHER,
      memo: null,
      txHash: "cd".repeat(32),
      explorerUrl: null,
      createdAt: "2026-10-12T09:00:00.000Z",
      confirmedAt: "2026-10-12T09:00:05.000Z",
    };
    const { send, calls } = backend({
      [`POST /v1/payment-requests/${ID}/attempts/a1/refunds`]: {
        body: {
          refundId: "r1",
          xdr: "AAAA",
          networkPassphrase: "Test SDF Network ; September 2015",
          expiresAt: "2026-10-12T09:05:00.000Z",
          fee: "0.0000100",
        },
      },
      [`POST /v1/payment-requests/${ID}/refunds/r1/submit`]: { body: refund },
      [`POST /v1/payment-requests/${ID}/attempts/a1/refunds/record`]: {
        body: { ...refund, source: "RECORDED" },
      },
    });
    const api = live(send);
    const prepared = await api.payments.prepareRefund(ID, "a1", {
      amount: "0.50",
      destination: OTHER,
      memo: "",
    });
    expect(prepared).toMatchObject({ refund_id: "r1", xdr: "AAAA" });
    // An empty memo is left out, so the backend applies none.
    expect(calls[0].body).toEqual({ amount: "0.50", destination: OTHER });

    expect(await api.payments.submitRefund(ID, "r1", "SIGNED")).toMatchObject({
      refund_id: "r1",
      status: "CONFIRMED",
    });
    expect(calls[1].body).toEqual({ signedXdr: "SIGNED" });

    await api.payments.recordRefund(ID, "a1", "cd".repeat(32));
    expect(calls[2].body).toEqual({ txHash: "cd".repeat(32) });
  });

  it("emails a link and exports the filtered list as CSV text", async () => {
    const { send } = backend({
      [`POST /v1/payment-requests/${ID}/send-email`]: {
        body: { sentTo: "j***@example.com" },
      },
    });
    expect(await live(send).payments.sendEmail(ID)).toBe("j***@example.com");

    const csv = "publicId,amount\n8Xk92LmQp4Za,150.00\n";
    const paths: string[] = [];
    const sendCsv: typeof fetch = async (input) => {
      paths.push(String(input));
      return new Response(csv, { headers: { "Content-Type": "text/csv" } });
    };
    expect(
      await live(sendCsv).payments.exportCsv({ status: "PENDING", q: "INV" }),
    ).toBe(csv);
    expect(paths).toEqual([
      "/v1/payment-requests/export?status=PENDING%2CPROCESSING&q=INV",
    ]);
  });

  it("passes the backend's wallet link and note to the payment page", async () => {
    const { send } = backend({
      "GET /v1/public/payment-requests/8Xk92LmQp4Za": {
        body: {
          publicId: "8Xk92LmQp4Za",
          status: "PENDING",
          merchant: { businessName: "ABC Digital" },
          amount: "150.00",
          asset: usdc,
          network: "TESTNET",
          description: "Website Design",
          reference: null,
          customerName: null,
          note: "Thanks for your business",
          dueDate: "2026-10-15",
          recipientAddress: WALLET,
          memo: { type: "text", value: "8Xk92LmQp4Za" },
          expiresAt: "2026-10-17T10:00:00.000Z",
          paidAt: null,
          txHash: null,
          explorerUrl: null,
          sep7Uri: "web+stellar:pay?destination=G",
        },
      },
    });
    expect(await live(send).checkout.get("8Xk92LmQp4Za")).toMatchObject({
      note: "Thanks for your business",
      due_date: "2026-10-15",
      sep7_uri: "web+stellar:pay?destination=G",
    });
  });
});

describe("live errors and status", () => {
  it("lower-cases codes and rewrites messages for people", () => {
    const error = toApiError(401, failure("INVALID_CREDENTIALS"));
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: "invalid_credentials",
      status: 401,
      message: "Email or password is incorrect.",
    });
  });

  it("uses the first field error for validation failures", () => {
    const error = toApiError(
      422,
      failure("VALIDATION_FAILED", {
        fields: [{ field: "email", errors: ["email must be an email"] }],
      }),
    );
    expect(error.message).toBe("Email must be an email.");
  });

  it("uses the customer message carried by a failed transaction", () => {
    const error = toApiError(
      422,
      failure("TX_FAILED", {
        stellarCode: "op_underfunded",
        message: "Your wallet does not have enough USDC.",
      }),
    );
    expect(error.message).toBe("Your wallet does not have enough USDC.");
    expect(error.details.stellarCode).toBe("op_underfunded");
  });

  it("shows a pending request whose last attempt failed as failed", () => {
    const base = { paidAt: null, txHash: null };
    expect(
      toCheckoutStatus({
        ...base,
        status: "PENDING",
        latestAttempt: { status: "FAILED", failureCode: "op_underfunded" },
      }),
    ).toMatchObject({
      status: "FAILED",
      failure_reason: "Your wallet does not have enough USDC.",
    });
    expect(
      toCheckoutStatus({
        ...base,
        status: "PENDING",
        latestAttempt: { status: "PREPARED", failureCode: null },
      }).status,
    ).toBe("PENDING");
    expect(
      toCheckoutStatus({
        ...base,
        status: "PROCESSING",
        latestAttempt: { status: "FAILED", failureCode: null },
      }).status,
    ).toBe("PROCESSING");
  });
});

describe("gateway", () => {
  const base: GatewayRequest = {
    method: "GET",
    path: ["v1", "me"],
    search: "",
    body: null,
    idempotencyKey: null,
    forwardedFor: null,
    session: null,
    access: null,
  };
  const apiUrl = "https://api.example";
  const session = (token: string): Reply => ({
    body: {
      accessToken: `access-${token}`,
      tokenType: "Bearer",
      expiresIn: 900,
      merchant,
    },
    headers: {
      "Set-Cookie": `payvia_refresh=${token}; Max-Age=1209600; Path=/v1/auth; HttpOnly; Secure; SameSite=None`,
    },
  });

  it("keeps the tokens from login in cookies and out of the response", async () => {
    const { send } = backend({ "POST /v1/auth/login": session("r1") });
    const result = await handleGatewayRequest(
      { ...base, method: "POST", path: ["v1", "auth", "login"], body: "{}" },
      { apiUrl, fetch: send },
    );
    expect(result).toEqual({
      status: 200,
      body: { merchant },
      session: { value: "r1", maxAge: 1209600 },
      access: { value: "access-r1", maxAge: 870 },
    });
  });

  it("passes a failed login through without touching cookies", async () => {
    const { send } = backend({
      "POST /v1/auth/login": {
        status: 401,
        body: failure("INVALID_CREDENTIALS"),
      },
    });
    const result = await handleGatewayRequest(
      { ...base, method: "POST", path: ["v1", "auth", "login"], body: "{}" },
      { apiUrl, fetch: send },
    );
    expect(result).toEqual({
      status: 401,
      body: failure("INVALID_CREDENTIALS"),
    });
  });

  it("sends the access token as a bearer and forwards query and key", async () => {
    const { send, calls } = backend({
      "POST /v1/payment-requests?x=1": { status: 201, body: request },
    });
    const result = await handleGatewayRequest(
      {
        ...base,
        method: "POST",
        path: ["v1", "payment-requests"],
        search: "?x=1",
        body: '{"amount":"1"}',
        idempotencyKey: "key-1",
        forwardedFor: "203.0.113.7",
        access: "token",
      },
      { apiUrl, fetch: send },
    );
    expect(result.status).toBe(201);
    expect(calls[0].headers.get("Authorization")).toBe("Bearer token");
    expect(calls[0].headers.get("Idempotency-Key")).toBe("key-1");
    expect(calls[0].headers.get("X-Forwarded-For")).toBe("203.0.113.7");
    expect(calls[0].body).toEqual({ amount: "1" });
  });

  it("answers 401 without calling the backend when there is no access token", async () => {
    const { send, calls } = backend({});
    const result = await handleGatewayRequest(
      { ...base, session: "r1" },
      { apiUrl, fetch: send },
    );
    expect(result.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("serves public endpoints without any token", async () => {
    const { send, calls } = backend({
      "GET /v1/public/payment-requests/8Xk92LmQp4Za/status": { body: {} },
    });
    const result = await handleGatewayRequest(
      {
        ...base,
        path: ["v1", "public", "payment-requests", "8Xk92LmQp4Za", "status"],
        access: "token",
      },
      { apiUrl, fetch: send },
    );
    expect(result.status).toBe(200);
    expect(calls[0].headers.has("Authorization")).toBe(false);
  });

  it("drops an access token the backend rejects", async () => {
    const { send } = backend({
      "GET /v1/me": { status: 401, body: failure("UNAUTHORIZED") },
    });
    const result = await handleGatewayRequest(
      { ...base, access: "stale", session: "r1" },
      { apiUrl, fetch: send },
    );
    expect(result).toMatchObject({ status: 401, access: null });
    expect(result).not.toHaveProperty("session");
  });

  const refresh = (session: string | null, access: string | null = null) => ({
    ...base,
    method: "POST",
    path: ["v1", "auth", "refresh"],
    session,
    access,
  });

  it("rotates the refresh token once for requests arriving together", async () => {
    const { send, calls } = backend({
      "POST /v1/auth/refresh": (call) => {
        expect(call.headers.get("Cookie")).toBe("payvia_refresh=old-a");
        return session("new-a");
      },
    });
    const results = await Promise.all([
      handleGatewayRequest(refresh("old-a"), { apiUrl, fetch: send }),
      handleGatewayRequest(refresh("old-a"), { apiUrl, fetch: send }),
    ]);
    expect(calls).toHaveLength(1);
    for (const result of results) {
      expect(result).toMatchObject({
        status: 204,
        session: { value: "new-a" },
        access: { value: "access-new-a" },
      });
    }
  });

  it("does not refresh when another tab already did", async () => {
    const { send, calls } = backend({});
    const result = await handleGatewayRequest(refresh("r1", "fresh"), {
      apiUrl,
      fetch: send,
    });
    expect(result).toEqual({ status: 204, body: null });
    expect(calls).toHaveLength(0);
  });

  it("ends the session only when the backend refuses the refresh token", async () => {
    const refused = backend({
      "POST /v1/auth/refresh": { status: 401, body: failure("REFRESH_REUSED") },
    });
    expect(
      await handleGatewayRequest(refresh("old-b"), {
        apiUrl,
        fetch: refused.send,
      }),
    ).toMatchObject({ status: 401, session: null, access: null });

    const down = backend({
      "POST /v1/auth/refresh": {
        status: 503,
        body: failure("SERVICE_UNAVAILABLE"),
      },
    });
    const result = await handleGatewayRequest(refresh("old-c"), {
      apiUrl,
      fetch: down.send,
    });
    expect(result.status).toBe(503);
    expect(result).not.toHaveProperty("session");
  });

  it("clears the cookies on logout even if the backend cannot be reached", async () => {
    const send: typeof fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const result = await handleGatewayRequest(
      {
        ...base,
        method: "POST",
        path: ["v1", "auth", "logout"],
        session: "r1",
      },
      { apiUrl, fetch: send },
    );
    expect(result).toEqual({
      status: 204,
      body: null,
      session: null,
      access: null,
    });
  });

  it("reports an unreachable backend as a 502", async () => {
    const send: typeof fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const result = await handleGatewayRequest(
      { ...base, access: "token" },
      { apiUrl, fetch: send },
    );
    expect(result.status).toBe(502);
  });
});

describe("gateway: account and email routes", () => {
  const base: GatewayRequest = {
    method: "POST",
    path: ["v1", "me"],
    search: "",
    body: null,
    idempotencyKey: null,
    forwardedFor: null,
    session: null,
    access: null,
  };
  const apiUrl = "https://api.example";

  it("lets email-link tokens through without a session", async () => {
    const { send, calls } = backend({
      "POST /v1/auth/verify-email": {
        body: { emailVerifiedAt: "2026-10-13T09:00:00.000Z" },
      },
    });
    const result = await handleGatewayRequest(
      { ...base, path: ["v1", "auth", "verify-email"], body: '{"token":"t"}' },
      { apiUrl, fetch: send },
    );
    expect(result.status).toBe(200);
    expect(calls[0].headers.has("Authorization")).toBe(false);
  });

  it("still asks for a session to resend the verification email", async () => {
    const { send, calls } = backend({});
    const result = await handleGatewayRequest(
      { ...base, path: ["v1", "auth", "verify-email", "resend"] },
      { apiUrl, fetch: send },
    );
    expect(result.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("clears the cookies when every session has ended", async () => {
    const { send, calls } = backend({
      "POST /v1/auth/logout-all": { status: 204 },
      "POST /v1/auth/reset-password": { body: {} },
      "DELETE /v1/me": { status: 204 },
    });
    const ended = { status: 204, body: null, session: null, access: null };

    expect(
      await handleGatewayRequest(
        {
          ...base,
          path: ["v1", "auth", "logout-all"],
          session: "r1",
          access: "token",
        },
        { apiUrl, fetch: send },
      ),
    ).toEqual(ended);
    // The backend reads its refresh cookie on /v1/auth routes.
    expect(calls[0].headers.get("Cookie")).toBe("payvia_refresh=r1");
    expect(calls[0].headers.get("Authorization")).toBe("Bearer token");

    expect(
      await handleGatewayRequest(
        { ...base, path: ["v1", "auth", "reset-password"], body: "{}" },
        { apiUrl, fetch: send },
      ),
    ).toEqual(ended);
    expect(
      await handleGatewayRequest(
        { ...base, method: "DELETE", body: "{}", access: "token" },
        { apiUrl, fetch: send },
      ),
    ).toEqual(ended);
  });

  it("keeps the session when one of those is refused", async () => {
    const { send } = backend({
      "DELETE /v1/me": { status: 403, body: failure("PASSWORD_INCORRECT") },
    });
    const result = await handleGatewayRequest(
      { ...base, method: "DELETE", body: "{}", access: "token" },
      { apiUrl, fetch: send },
    );
    expect(result).toEqual({
      status: 403,
      body: failure("PASSWORD_INCORRECT"),
    });
  });

  it("stores the new access token after a password change", async () => {
    const { send } = backend({
      "POST /v1/me/password": {
        body: { accessToken: "fresh", tokenType: "Bearer", expiresIn: 900 },
      },
    });
    const result = await handleGatewayRequest(
      { ...base, path: ["v1", "me", "password"], body: "{}", access: "old" },
      { apiUrl, fetch: send },
    );
    expect(result).toEqual({
      status: 204,
      body: null,
      access: { value: "fresh", maxAge: 870 },
    });
  });

  it("passes a CSV export through as a file", async () => {
    const send: typeof fetch = async () =>
      new Response("publicId,amount\n", {
        headers: { "Content-Type": "text/csv; charset=utf-8" },
      });
    const result = await handleGatewayRequest(
      {
        ...base,
        method: "GET",
        path: ["v1", "payment-requests", "export"],
        access: "token",
      },
      { apiUrl, fetch: send },
    );
    expect(result.file).toEqual({
      text: "publicId,amount\n",
      contentType: "text/csv; charset=utf-8",
    });
  });
});
