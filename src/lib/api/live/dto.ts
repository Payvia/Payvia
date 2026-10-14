import { z } from "zod";

// The PayVia backend's response shapes, from its OpenAPI document
// (<backend>/docs). Only the fields this app reads are listed; map.ts turns
// them into the app's own types.

const asset = z.object({ code: z.string(), issuer: z.string() });
const requestStatus = z.enum([
  "PENDING",
  "PROCESSING",
  "PAID",
  "EXPIRED",
  "CANCELLED",
]);
const attemptStatus = z.enum([
  "PREPARED",
  "SUBMITTED",
  "CONFIRMED",
  "FAILED",
  "MISMATCH",
  "DUPLICATE",
  "ABANDONED",
]);

export const merchantDto = z.object({
  id: z.string(),
  email: z.string(),
  businessName: z.string(),
  notifyPayments: z.boolean().default(true),
  emailVerifiedAt: z.string().nullish(),
});
export type MerchantDto = z.infer<typeof merchantDto>;

/** Login and register. The gateway keeps the tokens and passes this on. */
export const authSessionDto = z.object({ merchant: merchantDto });

export const walletDto = z.object({
  id: z.string(),
  address: z.string(),
  createdAt: z.string(),
});
export type WalletDto = z.infer<typeof walletDto>;
export const walletListDto = z.object({ data: z.array(walletDto) });

export const paymentRequestSummaryDto = z.object({
  id: z.string(),
  publicId: z.string(),
  status: requestStatus,
  amount: z.string(),
  asset,
  description: z.string(),
  reference: z.string().nullable(),
  customerName: z.string().nullable(),
  paymentUrl: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  paidAt: z.string().nullable(),
});
export type PaymentRequestSummaryDto = z.infer<typeof paymentRequestSummaryDto>;

const refundInDetailDto = z.object({
  id: z.string(),
  status: z.string(),
  amount: z.string(),
  destination: z.string(),
  txHash: z.string().nullable(),
  createdAt: z.string(),
});

const paymentAttemptDto = z.object({
  id: z.string(),
  status: attemptStatus,
  txHash: z.string(),
  customerAddress: z.string().nullable(),
  amountReceived: z.string().nullable(),
  overpaidBy: z.string().nullish(),
  assetReceived: z.object({ code: z.string() }).nullable(),
  failureCode: z.string().nullable(),
  createdAt: z.string(),
  refundableAmount: z.string().nullish(),
  refundWarning: z.string().nullish(),
  refunds: z.array(refundInDetailDto).default([]),
});
export type PaymentAttemptDto = z.infer<typeof paymentAttemptDto>;

export const paymentRequestDto = paymentRequestSummaryDto.extend({
  note: z.string().nullish(),
  overpaidBy: z.string().nullish(),
  refundableAmount: z.string().nullish(),
  attempts: z.array(paymentAttemptDto).default([]),
  network: z.enum(["TESTNET", "PUBLIC"]),
  recipientAddress: z.string(),
  customerEmail: z.string().nullable(),
  dueDate: z.string().nullable(),
  customerAddress: z.string().nullable(),
  txHash: z.string().nullable(),
  cancelledAt: z.string().nullable(),
});
export type PaymentRequestDto = z.infer<typeof paymentRequestDto>;

export const paymentRequestListDto = z.object({
  data: z.array(paymentRequestSummaryDto),
  nextCursor: z.string().nullable(),
});

export const dashboardSummaryDto = z.object({
  data: z.array(
    z.object({
      asset,
      totalRequested: z.string(),
      paid: z.string(),
      pending: z.string(),
      paymentLinks: z.number(),
      last7Days: z.object({ paidAmount: z.string(), paidCount: z.number() }),
    }),
  ),
});
export type DashboardSummaryDto = z.infer<typeof dashboardSummaryDto>;

export const publicPaymentRequestDto = z.object({
  publicId: z.string(),
  status: requestStatus,
  merchant: z.object({ businessName: z.string() }),
  amount: z.string(),
  asset,
  network: z.enum(["TESTNET", "PUBLIC"]),
  description: z.string(),
  reference: z.string().nullable(),
  recipientAddress: z.string(),
  note: z.string().nullish(),
  dueDate: z.string().nullish(),
  sep7Uri: z.string().nullish(),
  memo: z.object({ value: z.string() }),
  expiresAt: z.string(),
  paidAt: z.string().nullable(),
  txHash: z.string().nullable(),
});
export type PublicPaymentRequestDto = z.infer<typeof publicPaymentRequestDto>;

export const publicPaymentStatusDto = z.object({
  status: requestStatus,
  paidAt: z.string().nullable(),
  txHash: z.string().nullable(),
  latestAttempt: z
    .object({ status: attemptStatus, failureCode: z.string().nullable() })
    .nullable(),
});
export type PublicPaymentStatusDto = z.infer<typeof publicPaymentStatusDto>;

export const preparedPaymentDto = z.object({
  attemptId: z.string(),
  xdr: z.string(),
  networkPassphrase: z.string(),
  expiresAt: z.string(),
  fee: z.string(),
});
export type PreparedPaymentDto = z.infer<typeof preparedPaymentDto>;

export const submitResultDto = z.object({
  status: z.enum(["PAID", "PROCESSING"]),
  attempt: z.object({ txHash: z.string() }),
});
export type SubmitResultDto = z.infer<typeof submitResultDto>;

export const sessionListDto = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      userAgent: z.string().nullable(),
      ipPrefix: z.string().nullable(),
      createdAt: z.string(),
      lastUsedAt: z.string(),
      current: z.boolean(),
    }),
  ),
});
export type SessionListDto = z.infer<typeof sessionListDto>;

export const emailSentDto = z.object({ sentTo: z.string() });

export const preparedRefundDto = z.object({
  refundId: z.string(),
  xdr: z.string(),
  networkPassphrase: z.string(),
  expiresAt: z.string(),
  fee: z.string(),
});
export type PreparedRefundDto = z.infer<typeof preparedRefundDto>;

export const refundDto = z.object({
  id: z.string(),
  status: z.string(),
  amount: z.string(),
  destination: z.string(),
  txHash: z.string().nullable(),
  createdAt: z.string(),
});
export type RefundDto = z.infer<typeof refundDto>;
