import type { Merchant, PaymentStatus } from "../schemas";
import type { StoredPayment } from "./store";

const DAY = 24 * 60 * 60 * 1000;

// The project's Stellar Testnet accounts for the demo merchant and customer.
// Both are funded with XLM; see docs/05-stellar-payment-flow.md for what a
// real USDC payment between them still needs.
export const DEMO_MERCHANT_WALLET =
  "GBBHFEFQ25RTX2LKFNF3LQ6QSYF3JYBY6FCIRG4T4DP2Z77KFQU453JN";
export const DEMO_CUSTOMER_WALLET =
  "GCHS5QY33LBZA7B2PWCWQED66BDJ5J4L6J5LWZ322DTFNAL4EGDOKMSG";
export const DEMO_LOGIN = {
  email: "hello@abcdigital.com",
  password: "password123",
};

const hash = (n: number) =>
  `8e2a9f41${n.toString(16).padStart(48, "0")}d73c0b6a`;

type Row = [
  description: string,
  amount: string,
  status: PaymentStatus,
  customer: string,
  daysAgo: number,
  slug?: string,
];

// The first seven rows are the Payments screen in the designs. The rest pad
// the account out to the dashboard totals: 24 links, 2,850 paid, 1,400 pending,
// 175 USDC from 2 payments in the last 7 days.
const rows: Row[] = [
  ["Website Design", "150", "PAID", "John", 1, "8Xk92Lm"],
  ["Consultation", "50", "PENDING", "Maya", 1],
  ["Event Ticket", "25", "PAID", "Alex", 2],
  ["Website Design", "150", "PROCESSING", "Nora", 2],
  ["Consultation", "50", "FAILED", "Maya", 3],
  ["Event Ticket", "25", "EXPIRED", "Alex", 3],
  ["Consultation", "50", "CANCELLED", "John", 4],
  ["Brand Identity", "300", "PENDING", "Sarah", 9],
  ["Landing Page", "300", "PENDING", "Michael", 10],
  ["Retainer — October", "300", "PENDING", "Nora", 11],
  ["Workshop Seats", "300", "PENDING", "Alex", 12],
  ["Logo Design", "275", "PAID", "Sarah", 14],
  ...Array.from({ length: 12 }, (_, i): Row => [
    [
      "Website Maintenance",
      "Strategy Session",
      "Product Photography",
      "Copywriting",
    ][i % 4],
    "200",
    "PAID",
    ["John", "Maya", "Alex", "Nora", "Sarah", "Michael"][i % 6],
    15 + i * 2,
  ]),
];

export function seed(now: Date, appUrl: string) {
  const merchant: Merchant = {
    merchant_id: "m_demo",
    name: "ABC Digital",
    email: DEMO_LOGIN.email,
    business_name: "ABC Digital",
    logo_url: null,
    recipient_wallet: DEMO_MERCHANT_WALLET,
    wallets: [DEMO_MERCHANT_WALLET],
    network: "TESTNET",
    setup_complete: true,
    email_verified: true,
    notify_payments: true,
  };

  const first = 124;
  const payments = rows.map(
    (
      [description, amount, status, customer, daysAgo, slug],
      index,
    ): StoredPayment => {
      const number = first - index;
      // Stagger within the day so ordering is stable.
      const created = new Date(now.getTime() - daysAgo * DAY - index * 60_000);
      const settled = new Date(created.getTime() + 18 * 60_000).toISOString();
      const submitted = status === "PAID" || status === "PROCESSING";
      const id = String(number).padStart(5, "0");
      const paymentSlug = slug ?? `demo${id}`;

      return {
        payment_id: `PV-${created.getUTCFullYear()}-${id}`,
        slug: paymentSlug,
        merchant_id: merchant.merchant_id,
        amount,
        asset: "USDC",
        network: "TESTNET",
        description,
        customer_name: customer,
        reference: `INV-${id}`,
        recipient_wallet: DEMO_MERCHANT_WALLET,
        customer_wallet: submitted ? DEMO_CUSTOMER_WALLET : undefined,
        payment_url: `${appUrl}/pay/${paymentSlug}`,
        // Seeded processing rows carry no hash so they stay Processing.
        transaction_hash: status === "PAID" ? hash(number) : undefined,
        status,
        failure_reason:
          status === "FAILED"
            ? "The payment was not approved in the customer's wallet."
            : undefined,
        expires_at:
          status === "EXPIRED"
            ? new Date(created.getTime() + DAY).toISOString()
            : undefined,
        created_at: created.toISOString(),
        updated_at: status === "PENDING" ? created.toISOString() : settled,
        paid_at: status === "PAID" ? settled : undefined,
      };
    },
  );

  return {
    account: { merchant, password: DEMO_LOGIN.password },
    payments,
    sequence: first,
  };
}
