import { z } from "zod";
import { isValidPublicKey } from "@/lib/stellar/strkey";

export const paymentStatuses = [
  "CREATED",
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;

export const paymentStatusSchema = z.enum(paymentStatuses);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/** Decimal string with at most seven places, as Stellar represents amounts. */
export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,7})?$/, "Enter a valid amount.");

export const stellarAddressSchema = z
  .string()
  .refine(isValidPublicKey, "Enter a valid Stellar wallet address.");

export const assetSchema = z.enum(["USDC"]);
export type Asset = z.infer<typeof assetSchema>;

export const networkSchema = z.enum(["TESTNET", "PUBLIC"]);
export type Network = z.infer<typeof networkSchema>;

/** What a list row needs. The backend sends only this much for lists. */
export const paymentSummarySchema = z.object({
  payment_id: z.string(),
  /** The id in the payment link: /pay/[slug]. */
  slug: z.string(),
  amount: amountSchema,
  asset: assetSchema,
  description: z.string(),
  customer_name: z.string().optional(),
  reference: z.string().optional(),
  payment_url: z.url(),
  status: paymentStatusSchema,
  expires_at: z.iso.datetime().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  paid_at: z.iso.datetime().optional(),
});
export type PaymentSummary = z.infer<typeof paymentSummarySchema>;

/** A refund sent back from one payment. */
export const refundSchema = z.object({
  refund_id: z.string(),
  /** PREPARED, SUBMITTED, CONFIRMED, FAILED or ABANDONED. */
  status: z.string(),
  amount: amountSchema,
  destination: z.string(),
  transaction_hash: z.string().optional(),
  created_at: z.iso.datetime(),
});
export type Refund = z.infer<typeof refundSchema>;

export const attemptStatuses = [
  "PREPARED",
  "SUBMITTED",
  "CONFIRMED",
  "FAILED",
  /** Arrived on-chain but with the wrong amount or asset. */
  "MISMATCH",
  /** Arrived on-chain after the request was already paid. */
  "DUPLICATE",
  "ABANDONED",
] as const;

/** One payment made, or tried, against a request. */
export const attemptSchema = z.object({
  attempt_id: z.string(),
  status: z.enum(attemptStatuses),
  transaction_hash: z.string(),
  customer_wallet: z.string().optional(),
  amount_received: amountSchema.optional(),
  /** Code of the asset that arrived, which may not be the one requested. */
  asset_received: z.string().optional(),
  /** How much more than the requested amount arrived. */
  overpaid_by: amountSchema.optional(),
  failure_code: z.string().optional(),
  created_at: z.iso.datetime(),
  /** What can still be sent back to the customer. */
  refundable_amount: amountSchema.optional(),
  /** The payer may be an exchange, not the customer's own wallet. */
  payer_may_be_exchange: z.boolean(),
  refunds: z.array(refundSchema),
});
export type Attempt = z.infer<typeof attemptSchema>;

export const paymentSchema = paymentSummarySchema.extend({
  network: networkSchema,
  customer_email: z.string().optional(),
  /** Note from the merchant, shown to the customer. */
  note: z.string().optional(),
  due_date: z.string().optional(),
  recipient_wallet: stellarAddressSchema,
  customer_wallet: stellarAddressSchema.optional(),
  transaction_hash: z.string().optional(),
  failure_reason: z.string().optional(),
  /** Set when the customer paid more than was requested. */
  overpaid_by: amountSchema.optional(),
  refundable_amount: amountSchema.optional(),
  /** Live backend only. Newest first. */
  attempts: z.array(attemptSchema).optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

/** What a customer may see: no customer contact details. */
export const publicPaymentSchema = paymentSchema
  .omit({
    customer_email: true,
    customer_name: true,
    created_at: true,
    updated_at: true,
    overpaid_by: true,
    refundable_amount: true,
    attempts: true,
  })
  .extend({
    /** Ready-made "open in wallet app" link, when the backend sends one. */
    sep7_uri: z.string().optional(),
    merchant_name: z.string(),
    merchant_logo_url: z.string().nullable(),
    /** Text memo every payment must carry so it can be matched to this request. */
    memo: z.string(),
  });
export type PublicPayment = z.infer<typeof publicPaymentSchema>;

/** The part of a public payment that changes while a customer waits. */
export const checkoutStatusSchema = publicPaymentSchema.pick({
  status: true,
  paid_at: true,
  transaction_hash: true,
  failure_reason: true,
});
export type CheckoutStatus = z.infer<typeof checkoutStatusSchema>;

/** An unsigned payment transaction built by the backend for one customer. */
export const preparedPaymentSchema = z.object({
  attempt_id: z.string(),
  xdr: z.string(),
  network_passphrase: z.string(),
  expires_at: z.iso.datetime(),
  /** Network fee in XLM. */
  fee: amountSchema,
});
export type PreparedPayment = z.infer<typeof preparedPaymentSchema>;

export const submitPaymentSchema = z.object({
  attempt_id: z.string(),
  signed_xdr: z.string(),
});
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;

export const submitResultSchema = z.object({
  status: z.enum(["PAID", "PROCESSING"]),
  transaction_hash: z.string(),
});
export type SubmitResult = z.infer<typeof submitResultSchema>;

export const merchantSchema = z.object({
  merchant_id: z.string(),
  name: z.string(),
  email: z.email(),
  /** Display name on payment pages. Empty until setup is completed. */
  business_name: z.string(),
  logo_url: z.string().nullable(),
  recipient_wallet: stellarAddressSchema.nullable(),
  /** Every wallet on the account, the receiving one included. */
  wallets: z.array(stellarAddressSchema),
  network: networkSchema,
  setup_complete: z.boolean(),
  /** Unverified accounts cannot create payment links on the live backend. */
  email_verified: z.boolean(),
  /** Emails when a payment is confirmed or needs attention. */
  notify_payments: z.boolean(),
});
export type Merchant = z.infer<typeof merchantSchema>;

export const summarySchema = z.object({
  asset: assetSchema,
  /** Paid plus pending. */
  total_requested: amountSchema,
  paid: amountSchema,
  /** Pending and processing requests. */
  pending: amountSchema,
  payment_links: z.number().int(),
  last_7_days: z.object({
    volume: amountSchema,
    payments: z.number().int(),
  }),
});
export type Summary = z.infer<typeof summarySchema>;

export const paymentListSchema = z.object({
  items: z.array(paymentSummarySchema),
  /**
   * Requests the merchant has, ignoring filters. The live backend sends no
   * count, so there this is only exact enough to tell "none at all" from
   * "none matching".
   */
  total: z.number().int(),
});
export type PaymentList = z.infer<typeof paymentListSchema>;

export const statusFilters = [
  "ALL",
  "PAID",
  "PENDING",
  "EXPIRED",
  "CANCELLED",
] as const;
export type StatusFilter = (typeof statusFilters)[number];

export const listParamsSchema = z.object({
  status: z.enum(statusFilters).default("ALL"),
  q: z.string().trim().default(""),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type ListParams = z.input<typeof listParamsSchema>;

/** NONE leaves the expiry to the backend: never in mock mode, 7 days live. */
export const expiryOptions = ["NONE", "24H"] as const;

export const createPaymentSchema = z.object({
  amount: amountSchema.refine((value) => Number(value) > 0, {
    message: "Enter an amount to continue.",
  }),
  asset: assetSchema,
  description: z
    .string()
    .trim()
    .min(1, "Enter a description.")
    .max(120, "Keep the description under 120 characters."),
  expiry: z.enum(expiryOptions),
  reference: z.string().trim().max(40).optional(),
  customer_name: z.string().trim().max(80).optional(),
  customer_email: z.email("Enter a valid email address.").max(254).optional(),
  note: z.string().trim().max(500).optional(),
  due_date: z.iso.date().optional(),
  recipient_wallet: stellarAddressSchema,
  /** Needed by the live backend when the wallet is new to the account. */
  current_password: z.string().max(128).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a name of at least 2 characters.")
    .max(100),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(10, "Use at least 10 characters for your password.")
    .max(128, "Use at most 128 characters for your password."),
  /** Turnstile token from the sign-up form, when the captcha is on. */
  captcha_token: z.string().max(2048).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const updateMerchantSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, "Enter a merchant name of at least 2 characters.")
    .max(100)
    .optional(),
  logo_url: z.string().nullable().optional(),
  recipient_wallet: stellarAddressSchema.optional(),
  /** Needed by the live backend to change the receiving wallet. */
  current_password: z.string().max(128).optional(),
  notify_payments: z.boolean().optional(),
});
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;

const newPassword = z
  .string()
  .min(10, "Use at least 10 characters for your password.")
  .max(128, "Use at most 128 characters for your password.");
const currentPassword = z.string().min(1, "Enter your password.").max(128);

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
  captcha_token: z.string().max(2048).optional(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string(),
  new_password: newPassword,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  current_password: currentPassword,
  new_password: newPassword,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  current_password: currentPassword,
  new_email: z.email("Enter a valid email address.").max(254),
});
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

/** A browser or device the merchant is signed in on. */
export const sessionSchema = z.object({
  session_id: z.string(),
  user_agent: z.string().optional(),
  /** Masked network address, such as 102.90.123.0/24. */
  ip: z.string().optional(),
  created_at: z.iso.datetime(),
  last_used_at: z.iso.datetime(),
  current: z.boolean(),
});
export type Session = z.infer<typeof sessionSchema>;

export type PrepareRefundInput = {
  /** Default: everything still refundable. */
  amount?: string;
  /** Default: the account that paid. */
  destination?: string;
  /** Text memo, for example an exchange's deposit memo. */
  memo?: string;
};

/** An unsigned refund transaction for the merchant's wallet to sign. */
export const preparedRefundSchema = z.object({
  refund_id: z.string(),
  xdr: z.string(),
  network_passphrase: z.string(),
  expires_at: z.iso.datetime(),
  fee: amountSchema,
});
export type PreparedRefund = z.infer<typeof preparedRefundSchema>;

export type ExportParams = Pick<ListParams, "status" | "q">;

export const reportSubmittedSchema = z.object({
  transaction_hash: z.string().regex(/^[0-9a-f]{64}$/),
  customer_wallet: stellarAddressSchema,
});
export type ReportSubmittedInput = z.infer<typeof reportSubmittedSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
