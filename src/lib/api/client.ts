import { z } from "zod";
import { ApiError } from "./errors";
import { createTransport, type TransportOptions } from "./http";
import {
  checkoutStatusSchema,
  merchantSchema,
  paymentListSchema,
  paymentSchema,
  publicPaymentSchema,
  summarySchema,
  type ChangeEmailInput,
  type ChangePasswordInput,
  type CreatePaymentInput,
  type ExportParams,
  type ForgotPasswordInput,
  type ListParams,
  type LoginInput,
  type PreparedPayment,
  type PreparedRefund,
  type PrepareRefundInput,
  type Refund,
  type ReportSubmittedInput,
  type ResetPasswordInput,
  type Session,
  type SignupInput,
  type SubmitPaymentInput,
  type SubmitResult,
  type UpdateMerchantInput,
} from "./schemas";

export type ApiOptions = Pick<
  TransportOptions,
  "baseUrl" | "headers" | "fetch"
>;

const notInMock = () =>
  Promise.reject(
    new ApiError(
      "not_supported",
      "This needs the live backend; the mock API does not do it.",
      501,
    ),
  );
/** A method only the live backend has. Screens hide it with `features.backend`. */
const liveOnly = <Args extends unknown[], Result>() =>
  notInMock as (...args: Args) => Promise<Result>;

/**
 * Client for the mock API served by this app (lib/api/mock). The live backend
 * has its own client with the same shape: lib/api/live/client.ts.
 */
export function createApi(options: ApiOptions) {
  const request = createTransport(options);

  const ok = z.object({ ok: z.literal(true) });

  return {
    auth: {
      login: (input: LoginInput) =>
        request(merchantSchema, "/auth/login", { method: "POST", body: input }),
      signup: (input: SignupInput) =>
        request(merchantSchema, "/auth/signup", {
          method: "POST",
          body: input,
        }),
      logout: () => request(ok, "/auth/logout", { method: "POST" }),
      me: () => request(merchantSchema, "/me"),
      /** Confirms the address with the token from the verification email. */
      verifyEmail: liveOnly<[token: string], void>(),
      resendVerification: liveOnly<[], void>(),
      /** Always succeeds, so it does not reveal which emails have accounts. */
      forgotPassword: liveOnly<[input: ForgotPasswordInput], void>(),
      /** Ends every session; the merchant signs in again. */
      resetPassword: liveOnly<[input: ResetPasswordInput], void>(),
      /** Finishes an email change. Ends every session. */
      confirmEmailChange: liveOnly<[token: string], void>(),
      /** Signs the merchant out on every device, this one included. */
      logoutAll: liveOnly<[], void>(),
    },
    account: {
      /** Ends the other sessions; this one carries on. */
      changePassword: liveOnly<[input: ChangePasswordInput], void>(),
      /** Sends a confirmation link to the new address. */
      changeEmail: liveOnly<[input: ChangeEmailInput], void>(),
      sessions: liveOnly<[], Session[]>(),
      endSession: liveOnly<[sessionId: string], void>(),
      delete: liveOnly<[currentPassword: string], void>(),
    },
    merchant: {
      update: (input: UpdateMerchantInput) =>
        request(merchantSchema, "/merchant", { method: "PATCH", body: input }),
    },
    payments: {
      list: (params: ListParams = {}, signal?: AbortSignal) => {
        const query = new URLSearchParams();
        if (params.status && params.status !== "ALL") {
          query.set("status", params.status);
        }
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const suffix = query.size ? `?${query}` : "";
        return request(paymentListSchema, `/payments${suffix}`, { signal });
      },
      get: (paymentId: string) =>
        request(paymentSchema, `/payments/${encodeURIComponent(paymentId)}`),
      create: (input: CreatePaymentInput) =>
        request(paymentSchema, "/payments", { method: "POST", body: input }),
      cancel: (paymentId: string) =>
        request(
          paymentSchema,
          `/payments/${encodeURIComponent(paymentId)}/cancel`,
          { method: "POST" },
        ),
      summary: () => request(summarySchema, "/payments/summary"),
      /** Emails the link to the request's customer. Resolves the masked address. */
      sendEmail: liveOnly<[paymentId: string], string>(),
      /** The merchant's requests as a CSV file's text. */
      exportCsv: liveOnly<[params?: ExportParams], string>(),
      /** Builds a refund for the merchant's wallet to sign. */
      prepareRefund: liveOnly<
        [paymentId: string, attemptId: string, input?: PrepareRefundInput],
        PreparedRefund
      >(),
      submitRefund: liveOnly<
        [paymentId: string, refundId: string, signedXdr: string],
        Refund
      >(),
      /** Records a refund that was sent outside PayVia, by its hash. */
      recordRefund: liveOnly<
        [paymentId: string, attemptId: string, transactionHash: string],
        Refund
      >(),
    },
    checkout: {
      get: (slug: string) =>
        request(
          publicPaymentSchema,
          `/public/payments/${encodeURIComponent(slug)}`,
        ),
      /** The fields that change while a customer waits; cheap to poll. */
      status: (slug: string) =>
        request(
          checkoutStatusSchema,
          `/public/payments/${encodeURIComponent(slug)}`,
        ),
      /** Live backend only: it builds the transaction the customer signs. */
      prepare: liveOnly<
        [slug: string, customerWallet: string],
        PreparedPayment
      >(),
      /** Live backend only: it submits the signed transaction to Stellar. */
      submit: liveOnly<
        [slug: string, input: SubmitPaymentInput],
        SubmitResult
      >(),
      /**
       * Tells the mock backend a transaction went to Stellar from the browser.
       * The live backend submits it itself, so there this only re-reads.
       */
      reportSubmitted: (slug: string, input: ReportSubmittedInput) =>
        request(
          publicPaymentSchema,
          `/public/payments/${encodeURIComponent(slug)}/submitted`,
          { method: "POST", body: input },
        ),
    },
  };
}

export type PayViaApi = ReturnType<typeof createApi>;
