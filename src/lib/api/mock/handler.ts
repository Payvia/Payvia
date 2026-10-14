import { z } from "zod";
import { errors, isApiError } from "../errors";
import {
  createPaymentSchema,
  listParamsSchema,
  loginSchema,
  reportSubmittedSchema,
  signupSchema,
  updateMerchantSchema,
} from "../schemas";
import type { MockStore } from "./store";

export type MockRequest = {
  method: string;
  /** Path segments after /api/mock. */
  path: string[];
  query: URLSearchParams;
  body: unknown;
  /** Merchant id from the session cookie, if any. */
  session: string | null;
};

export type MockResponse = {
  status: number;
  body: unknown;
  /** Set to a merchant id to start a session, null to end it. */
  session?: string | null;
};

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw errors.invalid(result.error.issues[0]?.message ?? "Invalid request.");
  }
  return result.data;
}

function route(store: MockStore, req: MockRequest): MockResponse {
  const key = `${req.method} /${req.path.join("/")}`;
  const [a, b, c, d] = req.path;
  const json = (body: unknown, status = 200): MockResponse => ({
    status,
    body,
  });
  const merchantId = () => {
    if (!req.session) throw errors.unauthorized();
    return req.session;
  };

  switch (key) {
    case "POST /auth/login": {
      const merchant = store.login(parse(loginSchema, req.body));
      return { ...json(merchant), session: merchant.merchant_id };
    }
    case "POST /auth/signup": {
      const merchant = store.signup(parse(signupSchema, req.body));
      return { ...json(merchant, 201), session: merchant.merchant_id };
    }
    case "POST /auth/logout":
      return { ...json({ ok: true }), session: null };
    case "GET /me":
      return json(store.getMerchant(merchantId()));
    case "PATCH /merchant":
      return json(
        store.updateMerchant(
          merchantId(),
          parse(updateMerchantSchema, req.body),
        ),
      );
    case "GET /payments":
      return json(
        store.listPayments(
          merchantId(),
          parse(listParamsSchema, {
            status: req.query.get("status") ?? undefined,
            q: req.query.get("q") ?? undefined,
            limit: req.query.get("limit") ?? undefined,
          }),
        ),
      );
    case "GET /payments/summary":
      return json(store.summary(merchantId()));
    case "POST /payments":
      return json(
        store.createPayment(merchantId(), parse(createPaymentSchema, req.body)),
        201,
      );
  }

  if (a === "payments" && b) {
    if (req.method === "GET" && !c) {
      return json(store.getPayment(merchantId(), b));
    }
    if (req.method === "POST" && c === "cancel" && !d) {
      return json(store.cancelPayment(merchantId(), b));
    }
  }

  if (a === "public" && b === "payments" && c) {
    if (req.method === "GET" && !d) return json(store.getPublic(c));
    if (req.method === "POST" && d === "submitted") {
      return json(
        store.reportSubmitted(c, parse(reportSubmittedSchema, req.body)),
      );
    }
  }

  throw errors.notFound("Endpoint");
}

export function handleMockRequest(
  store: MockStore,
  req: MockRequest,
): MockResponse {
  try {
    return route(store, req);
  } catch (error) {
    if (isApiError(error)) {
      return {
        status: error.status,
        body: { error: { code: error.code, message: error.message } },
      };
    }
    throw error;
  }
}
