import { sumAmounts } from "@/lib/amount";
import { isCancellable, isPayable } from "@/lib/status";
import { errors } from "../errors";
import type {
  CreatePaymentInput,
  ListParams,
  LoginInput,
  Merchant,
  Payment,
  PaymentList,
  PaymentStatus,
  PublicPayment,
  ReportSubmittedInput,
  SignupInput,
  Summary,
  UpdateMerchantInput,
} from "../schemas";
import { listParamsSchema } from "../schemas";
import { seed } from "./seed";

const DAY = 24 * 60 * 60 * 1000;
const SLUG_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** How long the mock "verifies on Stellar" before a payment turns Paid. */
export const MOCK_CONFIRMATION_MS = 6000;

type Account = { merchant: Merchant; password: string };

/** A payment as the mock keeps it, with the merchant it belongs to. */
export type StoredPayment = Payment & { merchant_id: string };

export type StoreOptions = {
  appUrl: string;
  now?: () => Date;
  /** Start with the demo merchant and the payments shown in the designs. */
  seeded?: boolean;
};

/**
 * In-memory stand-in for the PayVia backend. It exists so the frontend can be
 * built and tested before the real API; nothing here verifies anything
 * on-chain.
 */
export class MockStore {
  private accounts: Account[] = [];
  private payments: StoredPayment[] = [];
  private sequence = 0;
  private readonly appUrl: string;
  private readonly now: () => Date;

  constructor({ appUrl, now = () => new Date(), seeded = true }: StoreOptions) {
    this.appUrl = appUrl.replace(/\/$/, "");
    this.now = now;
    if (seeded) {
      const data = seed(this.now(), this.appUrl);
      this.accounts = [data.account];
      this.payments = data.payments;
      this.sequence = data.sequence;
    }
  }

  // ---- auth and merchant

  signup(input: SignupInput): Merchant {
    const email = input.email.toLowerCase();
    if (this.accounts.some((a) => a.merchant.email === email)) {
      throw errors.emailTaken();
    }
    const merchant: Merchant = {
      merchant_id: `m_${this.randomSlug(10)}`,
      name: input.name,
      email,
      business_name: "",
      logo_url: null,
      recipient_wallet: null,
      wallets: [],
      network: "TESTNET",
      setup_complete: false,
      email_verified: true,
      notify_payments: true,
    };
    this.accounts.push({ merchant, password: input.password });
    return merchant;
  }

  login(input: LoginInput): Merchant {
    const account = this.accounts.find(
      (a) => a.merchant.email === input.email.toLowerCase(),
    );
    if (!account || account.password !== input.password) {
      throw errors.invalidCredentials();
    }
    return account.merchant;
  }

  getMerchant(merchantId: string): Merchant {
    return this.account(merchantId).merchant;
  }

  updateMerchant(merchantId: string, input: UpdateMerchantInput): Merchant {
    const account = this.account(merchantId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { current_password, ...changes } = input;
    const next = { ...account.merchant, ...changes };
    next.wallets = next.recipient_wallet ? [next.recipient_wallet] : [];
    next.setup_complete = Boolean(next.business_name && next.recipient_wallet);
    account.merchant = next;
    return next;
  }

  // ---- merchant payments

  listPayments(merchantId: string, params: ListParams = {}): PaymentList {
    const { status, q, limit } = listParamsSchema.parse(params);
    const all = this.forMerchant(merchantId);
    const query = q.toLowerCase();

    const items = all
      .filter((p) => matchesFilter(p.status, status))
      .filter(
        (p) =>
          !query ||
          [p.description, p.reference, p.customer_name, p.payment_id].some(
            (field) => field?.toLowerCase().includes(query),
          ),
      );

    return { items: limit ? items.slice(0, limit) : items, total: all.length };
  }

  getPayment(merchantId: string, paymentId: string): StoredPayment {
    const payment = this.forMerchant(merchantId).find(
      (p) => p.payment_id === paymentId,
    );
    if (!payment) throw errors.notFound();
    return payment;
  }

  createPayment(merchantId: string, input: CreatePaymentInput): StoredPayment {
    const merchant = this.getMerchant(merchantId);
    const now = this.now();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { expiry, current_password, ...fields } = input;
    const slug = this.randomSlug(7);
    this.sequence += 1;

    const payment: StoredPayment = {
      ...stripEmpty(fields),
      payment_id: `PV-${now.getUTCFullYear()}-${String(this.sequence).padStart(5, "0")}`,
      slug,
      merchant_id: merchantId,
      network: merchant.network,
      payment_url: `${this.appUrl}/pay/${slug}`,
      status: "PENDING",
      expires_at:
        expiry === "24H"
          ? new Date(now.getTime() + DAY).toISOString()
          : undefined,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    this.payments.unshift(payment);
    return payment;
  }

  cancelPayment(merchantId: string, paymentId: string): StoredPayment {
    const payment = this.getPayment(merchantId, paymentId);
    if (!isCancellable(payment.status)) throw errors.notCancellable();
    return this.transition(payment, "CANCELLED");
  }

  summary(merchantId: string): Summary {
    const all = this.forMerchant(merchantId);
    const amounts = (list: Payment[]) => sumAmounts(list.map((p) => p.amount));
    const paid = all.filter((p) => p.status === "PAID");
    const pending = all.filter((p) =>
      (["CREATED", "PENDING", "PROCESSING"] as PaymentStatus[]).includes(
        p.status,
      ),
    );
    const weekAgo = this.now().getTime() - 7 * DAY;
    const recent = paid.filter(
      (p) => p.paid_at && new Date(p.paid_at).getTime() >= weekAgo,
    );

    return {
      asset: "USDC",
      total_requested: amounts([...paid, ...pending]),
      paid: amounts(paid),
      pending: amounts(pending),
      payment_links: all.length,
      last_7_days: { volume: amounts(recent), payments: recent.length },
    };
  }

  // ---- public checkout

  getPublic(slug: string): PublicPayment {
    return this.toPublic(this.bySlug(slug));
  }

  reportSubmitted(slug: string, input: ReportSubmittedInput): PublicPayment {
    const payment = this.bySlug(slug);
    if (!isPayable(payment.status)) throw errors.notPayable();
    payment.transaction_hash = input.transaction_hash;
    payment.customer_wallet = input.customer_wallet;
    payment.failure_reason = undefined;
    return this.toPublic(this.transition(payment, "PROCESSING"));
  }

  // ---- internals

  private account(merchantId: string): Account {
    const account = this.accounts.find(
      (a) => a.merchant.merchant_id === merchantId,
    );
    if (!account) throw errors.unauthorized();
    return account;
  }

  private forMerchant(merchantId: string): StoredPayment[] {
    this.account(merchantId);
    this.advance();
    return this.payments
      .filter((p) => p.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  private bySlug(slug: string): StoredPayment {
    this.advance();
    const payment = this.payments.find((p) => p.slug === slug);
    if (!payment) throw errors.notFound();
    return payment;
  }

  /** Apply time-based changes: expiry, and the mock confirmation delay. */
  private advance() {
    const now = this.now().getTime();
    for (const payment of this.payments) {
      if (
        isPayable(payment.status) &&
        payment.expires_at &&
        new Date(payment.expires_at).getTime() <= now
      ) {
        this.transition(payment, "EXPIRED");
      }
      if (
        payment.status === "PROCESSING" &&
        // Seeded processing rows have no hash and stay as they are.
        payment.transaction_hash &&
        now - new Date(payment.updated_at).getTime() >= MOCK_CONFIRMATION_MS
      ) {
        payment.paid_at = this.now().toISOString();
        this.transition(payment, "PAID");
      }
    }
  }

  private transition<T extends Payment>(payment: T, status: PaymentStatus): T {
    payment.status = status;
    payment.updated_at = this.now().toISOString();
    return payment;
  }

  private toPublic(payment: StoredPayment): PublicPayment {
    const merchant = this.getMerchant(payment.merchant_id);
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      merchant_id,
      customer_email,
      customer_name,
      created_at,
      updated_at,
      ...rest
    } = payment;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return {
      ...rest,
      memo: payment.payment_id,
      merchant_name: merchant.business_name || merchant.name,
      merchant_logo_url: merchant.logo_url,
    };
  }

  private randomSlug(length: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(
      bytes,
      (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length],
    ).join("");
  }
}

function matchesFilter(status: PaymentStatus, filter: string) {
  if (filter === "ALL") return true;
  if (filter === "PENDING") return status === "PENDING" || status === "CREATED";
  return status === filter;
}

function stripEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== "" && v !== undefined),
  ) as T;
}
