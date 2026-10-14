import { messageForFailureCode } from "@/lib/stellar/submit-errors";
import { ApiError } from "../errors";
import {
  apiErrorSchema,
  type CheckoutStatus,
  type Merchant,
  type Network,
  type Payment,
  type PaymentSummary,
  type PreparedPayment,
  type PreparedRefund,
  type Refund,
  type Session,
  type PublicPayment,
  type SubmitResult,
  type Summary,
} from "../schemas";
import type {
  DashboardSummaryDto,
  MerchantDto,
  PaymentAttemptDto,
  PaymentRequestDto,
  PaymentRequestSummaryDto,
  PreparedPaymentDto,
  PreparedRefundDto,
  RefundDto,
  SessionListDto,
  PublicPaymentRequestDto,
  PublicPaymentStatusDto,
  SubmitResultDto,
  WalletDto,
} from "./dto";

// Backend shapes (dto.ts) to the app's own types (../schemas.ts). The results
// are parsed against those schemas by the client, so a value the app cannot
// handle, such as an asset other than USDC, fails there.

const orUndefined = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

/** The wallet new requests are paid to: the one added most recently. */
export function receivingWallet(wallets: WalletDto[]): WalletDto | undefined {
  return wallets.reduce<WalletDto | undefined>(
    (latest, wallet) =>
      !latest || wallet.createdAt > latest.createdAt ? wallet : latest,
    undefined,
  );
}

export function toMerchant(
  dto: MerchantDto,
  wallets: WalletDto[],
  network: Network,
): Merchant {
  const wallet = receivingWallet(wallets);
  return {
    merchant_id: dto.id,
    // The backend keeps one name per account: the business name.
    name: dto.businessName,
    email: dto.email,
    business_name: dto.businessName,
    // Logos are not part of the backend yet.
    logo_url: null,
    recipient_wallet: wallet?.address ?? null,
    wallets: wallets.map((entry) => entry.address),
    network,
    setup_complete: Boolean(wallet),
    email_verified: Boolean(dto.emailVerifiedAt),
    notify_payments: dto.notifyPayments,
  };
}

export function toPaymentSummary(dto: PaymentRequestSummaryDto) {
  return {
    payment_id: dto.id,
    slug: dto.publicId,
    amount: dto.amount,
    asset: dto.asset.code,
    description: dto.description,
    customer_name: orUndefined(dto.customerName),
    reference: orUndefined(dto.reference),
    payment_url: dto.paymentUrl,
    status: dto.status,
    expires_at: dto.expiresAt,
    created_at: dto.createdAt,
    // Not sent by the backend; a payment is its only later change in a list.
    updated_at: dto.paidAt ?? dto.createdAt,
    paid_at: orUndefined(dto.paidAt),
  } as PaymentSummary;
}

export function toRefund(dto: RefundDto): Refund {
  return {
    refund_id: dto.id,
    status: dto.status,
    amount: dto.amount,
    destination: dto.destination,
    transaction_hash: orUndefined(dto.txHash),
    created_at: dto.createdAt,
  };
}

function toAttempt(dto: PaymentAttemptDto) {
  return {
    attempt_id: dto.id,
    status: dto.status,
    transaction_hash: dto.txHash,
    customer_wallet: orUndefined(dto.customerAddress),
    amount_received: orUndefined(dto.amountReceived),
    asset_received: dto.assetReceived?.code,
    overpaid_by: orUndefined(dto.overpaidBy),
    failure_code: orUndefined(dto.failureCode),
    created_at: dto.createdAt,
    refundable_amount: orUndefined(dto.refundableAmount),
    payer_may_be_exchange: dto.refundWarning === "SOURCE_MAY_BE_EXCHANGE",
    refunds: dto.refunds.map(toRefund),
  };
}

export function toPayment(dto: PaymentRequestDto) {
  return {
    ...toPaymentSummary(dto),
    note: orUndefined(dto.note),
    overpaid_by: orUndefined(dto.overpaidBy),
    refundable_amount: orUndefined(dto.refundableAmount),
    attempts: dto.attempts.map(toAttempt),
    updated_at: dto.paidAt ?? dto.cancelledAt ?? dto.createdAt,
    network: dto.network,
    customer_email: orUndefined(dto.customerEmail),
    due_date: orUndefined(dto.dueDate),
    recipient_wallet: dto.recipientAddress,
    customer_wallet: orUndefined(dto.customerAddress),
    transaction_hash: orUndefined(dto.txHash),
  } as Payment;
}

const ZERO = "0.00";

export function toSummary(dto: DashboardSummaryDto) {
  // One entry per asset; none at all until the first request is created.
  const usdc = dto.data.find((entry) => entry.asset.code === "USDC");
  return {
    asset: "USDC",
    total_requested: usdc?.totalRequested ?? ZERO,
    paid: usdc?.paid ?? ZERO,
    pending: usdc?.pending ?? ZERO,
    payment_links: usdc?.paymentLinks ?? 0,
    last_7_days: {
      volume: usdc?.last7Days.paidAmount ?? ZERO,
      payments: usdc?.last7Days.paidCount ?? 0,
    },
  } satisfies Summary;
}

export function toPublicPayment(dto: PublicPaymentRequestDto, appUrl: string) {
  return {
    // Customers see the link id; the request's internal id is not public.
    payment_id: dto.publicId,
    slug: dto.publicId,
    amount: dto.amount,
    asset: dto.asset.code,
    network: dto.network,
    description: dto.description,
    reference: orUndefined(dto.reference),
    note: orUndefined(dto.note),
    due_date: orUndefined(dto.dueDate),
    sep7_uri: orUndefined(dto.sep7Uri),
    recipient_wallet: dto.recipientAddress,
    payment_url: `${appUrl.replace(/\/$/, "")}/pay/${dto.publicId}`,
    transaction_hash: orUndefined(dto.txHash),
    status: dto.status,
    expires_at: dto.expiresAt,
    paid_at: orUndefined(dto.paidAt),
    merchant_name: dto.merchant.businessName,
    merchant_logo_url: null,
    memo: dto.memo.value,
  } as PublicPayment;
}

export function toCheckoutStatus(dto: PublicPaymentStatusDto): CheckoutStatus {
  const attempt = dto.latestAttempt;
  // The backend leaves a request PENDING when a payment attempt fails. The
  // app's FAILED means exactly that: the last try failed, and it can be paid.
  const failed =
    dto.status === "PENDING" &&
    (attempt?.status === "FAILED" || attempt?.status === "MISMATCH");
  return {
    status: failed ? "FAILED" : dto.status,
    paid_at: orUndefined(dto.paidAt),
    transaction_hash: orUndefined(dto.txHash),
    failure_reason: failed
      ? messageForFailureCode(attempt?.failureCode)
      : undefined,
  };
}

export function toPreparedPayment(dto: PreparedPaymentDto): PreparedPayment {
  return {
    attempt_id: dto.attemptId,
    xdr: dto.xdr,
    network_passphrase: dto.networkPassphrase,
    expires_at: dto.expiresAt,
    fee: dto.fee,
  };
}

export function toSubmitResult(dto: SubmitResultDto): SubmitResult {
  return { status: dto.status, transaction_hash: dto.attempt.txHash };
}

export function toPreparedRefund(dto: PreparedRefundDto): PreparedRefund {
  return {
    refund_id: dto.refundId,
    xdr: dto.xdr,
    network_passphrase: dto.networkPassphrase,
    expires_at: dto.expiresAt,
    fee: dto.fee,
  };
}

export function toSessions(dto: SessionListDto): Session[] {
  return dto.data.map((session) => ({
    session_id: session.id,
    user_agent: orUndefined(session.userAgent),
    ip: orUndefined(session.ipPrefix),
    created_at: session.createdAt,
    last_used_at: session.lastUsedAt,
    current: session.current,
  }));
}

// ---- errors

// The backend's messages are written for developers. These replace them where
// a merchant or customer reads the result.
const messages: Record<string, string> = {
  unauthorized: "Log in to continue.",
  invalid_credentials: "Email or password is incorrect.",
  email_taken: "An account with this email already exists.",
  account_locked:
    "Too many failed attempts. This account is locked for a while; try again later.",
  account_suspended:
    "This account has been suspended. Contact support for help.",
  rate_limited: "Too many requests. Wait a moment and try again.",
  password_incorrect: "That password is not correct.",
  email_not_verified:
    "Verify your email address first. Check your inbox for the link we sent.",
  token_invalid:
    "This link has expired or was already used. Ask for a new one.",
  account_has_processing:
    "A payment is being confirmed right now. Try again once it has finished.",
  email_send_limit:
    "This link has been emailed as often as allowed for now. Try again tomorrow.",
  export_too_large:
    "That is too much to export at once. Narrow the search or status, then try again.",
  refund_not_allowed: "This payment cannot be refunded.",
  refund_amount_too_high: "That is more than can be refunded for this payment.",
  refund_tx_mismatch:
    "That transaction does not match a refund for this payment.",
  captcha_failed:
    "The security check did not pass. Complete it again, then retry.",
  captcha_unavailable:
    "The security check is not available right now. Try again in a moment.",
  not_implemented: "This part of PayVia is not available yet.",
  invalid_address: "Enter a valid Stellar wallet address. It starts with G.",
  account_not_found:
    "This wallet is not active on Stellar yet. Fund it, then try again.",
  no_trustline:
    "This wallet cannot hold USDC yet. Add USDC to it (a trustline), then try again.",
  wallet_has_open_requests:
    "This wallet still has open payment requests. Wait for them to be paid, or cancel them, then try again.",
  asset_not_supported: "This asset is not supported yet.",
  payment_request_not_found: "Payment request not found.",
  invalid_state: "This request can no longer be cancelled.",
  request_in_progress:
    "This request is already being created. Give it a moment.",
  not_payable: "This payment request is no longer active.",
  insufficient_balance: "Your wallet does not have enough USDC.",
  insufficient_xlm_for_fee:
    "Your wallet does not have enough XLM for the network fee.",
  self_payment: "A payment request cannot be paid from the wallet it pays.",
  tx_mismatch:
    "The signed payment did not match this request. Please try again.",
  attempt_in_progress: "This payment is already being submitted.",
  payments_paused: "Payments are paused for the moment. Try again later.",
  stellar_unavailable:
    "Stellar is not responding right now. Try again in a moment.",
};

const sentence = (text: string) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}${/[.!?]$/.test(text) ? "" : "."}`;

/** The first field error of a VALIDATION_FAILED response, if it has one. */
function validationMessage(details: Record<string, unknown>) {
  const fields = details.fields;
  if (!Array.isArray(fields)) return undefined;
  const first = (fields[0] as { errors?: unknown } | undefined)?.errors;
  return Array.isArray(first) && typeof first[0] === "string"
    ? sentence(first[0])
    : undefined;
}

/** Builds an ApiError from a backend error response. Codes are lower-cased. */
export function toApiError(status: number, json: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(json);
  if (!parsed.success) {
    return new ApiError(
      "unknown_error",
      "Something went wrong. Please try again.",
      status,
    );
  }
  const { code: rawCode, message, details = {} } = parsed.data.error;
  const code = rawCode.toLowerCase();
  // TX_FAILED carries a message written for the customer.
  const fromDetails =
    code === "tx_failed" && typeof details.message === "string"
      ? details.message
      : code === "validation_failed"
        ? validationMessage(details)
        : undefined;
  return new ApiError(code, fromDetails ?? messages[code] ?? message, status, {
    details,
  });
}
