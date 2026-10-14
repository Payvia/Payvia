import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "../errors";
import { paymentSchema, publicPaymentSchema, summarySchema } from "../schemas";
import { DEMO_CUSTOMER_WALLET, DEMO_LOGIN, DEMO_MERCHANT_WALLET } from "./seed";
import { MOCK_CONFIRMATION_MS, MockStore } from "./store";

const HOUR = 60 * 60 * 1000;
const merchantId = "m_demo";
const txHash = "ab".repeat(32);

let clock: Date;
let store: MockStore;

const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};

const newRequest = (expiry: "NONE" | "24H" = "NONE") =>
  store.createPayment(merchantId, {
    amount: "100",
    asset: "USDC",
    description: "Test request",
    expiry,
    recipient_wallet: DEMO_MERCHANT_WALLET,
  });

beforeEach(() => {
  clock = new Date("2026-10-09T12:00:00Z");
  store = new MockStore({ appUrl: "https://payvia.app", now: () => clock });
});

describe("seed data", () => {
  it("matches the dashboard in the designs", () => {
    const summary = summarySchema.parse(store.summary(merchantId));
    expect(summary).toMatchObject({
      total_requested: "4250",
      paid: "2850",
      pending: "1400",
      payment_links: 24,
      last_7_days: { volume: "175", payments: 2 },
    });
  });

  it("produces payments that satisfy the schema", () => {
    const { items } = store.listPayments(merchantId);
    expect(items).toHaveLength(24);
    for (const payment of items) paymentSchema.parse(payment);
    expect(items[0]).toMatchObject({
      payment_id: "PV-2026-00124",
      reference: "INV-00124",
      status: "PAID",
    });
  });
});

describe("auth", () => {
  it("logs in the demo merchant and rejects a wrong password", () => {
    expect(store.login(DEMO_LOGIN).merchant_id).toBe(merchantId);
    expect(() => store.login({ ...DEMO_LOGIN, password: "nope" })).toThrow(
      ApiError,
    );
  });

  it("creates accounts that need setup, and refuses duplicate emails", () => {
    const input = {
      name: "Ada",
      email: "Ada@Example.com",
      password: "12345678",
    };
    const merchant = store.signup(input);
    expect(merchant).toMatchObject({
      email: "ada@example.com",
      setup_complete: false,
    });
    expect(() => store.signup(input)).toThrow(/already exists/);

    const updated = store.updateMerchant(merchant.merchant_id, {
      business_name: "Ada Studio",
      recipient_wallet: DEMO_MERCHANT_WALLET,
    });
    expect(updated.setup_complete).toBe(true);
    expect(store.listPayments(merchant.merchant_id).items).toHaveLength(0);
  });
});

describe("listing", () => {
  it("filters by status, treating Processing and Failed as All-only", () => {
    const count = (status: "PAID" | "PENDING" | "EXPIRED" | "CANCELLED") =>
      store.listPayments(merchantId, { status }).items.length;
    expect(count("PAID")).toBe(15);
    expect(count("PENDING")).toBe(5);
    expect(count("EXPIRED")).toBe(1);
    expect(count("CANCELLED")).toBe(1);
  });

  it("searches description, reference and customer", () => {
    const search = (q: string) => store.listPayments(merchantId, { q }).items;
    expect(search("inv-00123")).toHaveLength(1);
    expect(search("  MAYA ")).toHaveLength(4);
    expect(search("nothing matches this")).toHaveLength(0);
  });
});

describe("creating and cancelling", () => {
  it("assigns the next id, a link, and Pending status", () => {
    const payment = newRequest();
    expect(payment.payment_id).toBe("PV-2026-00125");
    expect(payment.payment_url).toBe(`https://payvia.app/pay/${payment.slug}`);
    expect(payment.status).toBe("PENDING");
    expect(payment.expires_at).toBeUndefined();
    expect(store.listPayments(merchantId).items[0].payment_id).toBe(
      payment.payment_id,
    );
    expect(store.summary(merchantId).pending).toBe("1500");
  });

  it("cancels a pending request once", () => {
    const { payment_id } = newRequest();
    expect(store.cancelPayment(merchantId, payment_id).status).toBe(
      "CANCELLED",
    );
    expect(() => store.cancelPayment(merchantId, payment_id)).toThrow(
      /no longer be cancelled/,
    );
  });

  it("does not expose one merchant's payments to another", () => {
    const other = store.signup({
      name: "Eve",
      email: "eve@example.com",
      password: "12345678",
    });
    expect(() => store.getPayment(other.merchant_id, "PV-2026-00124")).toThrow(
      /not found/,
    );
  });
});

describe("expiry", () => {
  it("expires a 24 hour link and blocks payment", () => {
    const { slug, payment_id } = newRequest("24H");
    advance(23 * HOUR);
    expect(store.getPublic(slug).status).toBe("PENDING");
    advance(2 * HOUR);
    expect(store.getPublic(slug).status).toBe("EXPIRED");
    expect(store.getPayment(merchantId, payment_id).status).toBe("EXPIRED");
    expect(() =>
      store.reportSubmitted(slug, {
        transaction_hash: txHash,
        customer_wallet: DEMO_CUSTOMER_WALLET,
      }),
    ).toThrow(/no longer active/);
  });
});

describe("checkout", () => {
  it("hides merchant-only fields from the public view", () => {
    const view = publicPaymentSchema.parse(store.getPublic("8Xk92Lm"));
    expect(view.merchant_name).toBe("ABC Digital");
    expect(view).not.toHaveProperty("customer_name");
    expect(view).not.toHaveProperty("merchant_id");
  });

  it("moves Pending → Processing → Paid after the confirmation delay", () => {
    const { slug, payment_id } = newRequest();
    const submitted = store.reportSubmitted(slug, {
      transaction_hash: txHash,
      customer_wallet: DEMO_CUSTOMER_WALLET,
    });
    expect(submitted.status).toBe("PROCESSING");

    advance(MOCK_CONFIRMATION_MS - 1);
    expect(store.getPublic(slug).status).toBe("PROCESSING");
    advance(1);

    const paid = store.getPayment(merchantId, payment_id);
    expect(paid).toMatchObject({ status: "PAID", transaction_hash: txHash });
    expect(paid.paid_at).toBeDefined();
    expect(store.summary(merchantId).paid).toBe("2950");
  });

  it("refuses a second submission and unknown links", () => {
    const { slug } = newRequest();
    const input = {
      transaction_hash: txHash,
      customer_wallet: DEMO_CUSTOMER_WALLET,
    };
    store.reportSubmitted(slug, input);
    expect(() => store.reportSubmitted(slug, input)).toThrow(ApiError);
    expect(() => store.getPublic("missing")).toThrow(/not found/);
  });
});
