import { z } from "zod";
import type { PayViaApi } from "../client";
import { ApiError, errors } from "../errors";
import { createTransport, type TransportOptions } from "../http";
import {
  checkoutStatusSchema,
  merchantSchema,
  paymentListSchema,
  paymentSchema,
  preparedPaymentSchema,
  preparedRefundSchema,
  publicPaymentSchema,
  refundSchema,
  sessionSchema,
  submitResultSchema,
  summarySchema,
  type Merchant,
  type Network,
} from "../schemas";
import {
  authSessionDto,
  dashboardSummaryDto,
  emailSentDto,
  merchantDto,
  paymentRequestDto,
  paymentRequestListDto,
  preparedPaymentDto,
  preparedRefundDto,
  publicPaymentRequestDto,
  publicPaymentStatusDto,
  refundDto,
  sessionListDto,
  submitResultDto,
  walletDto,
  walletListDto,
  type MerchantDto,
  type WalletDto,
} from "./dto";
import {
  receivingWallet,
  toApiError,
  toCheckoutStatus,
  toMerchant,
  toPayment,
  toPaymentSummary,
  toPreparedPayment,
  toPreparedRefund,
  toPublicPayment,
  toRefund,
  toSessions,
  toSubmitResult,
  toSummary,
} from "./map";

export type LiveApiOptions = Pick<
  TransportOptions,
  "baseUrl" | "headers" | "fetch" | "recover"
> & {
  /** This app's public URL, for payment links the backend does not send. */
  appUrl: string;
  network: Network;
};

const DAY = 24 * 60 * 60 * 1000;
/** The backend's largest page. The lists here are not paginated yet. */
const MAX_PAGE = 100;

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const PUBLIC_ID = /^[0-9A-Za-z]{12}$/;

/**
 * Client for the PayVia backend (see <backend>/docs), with the same shape as
 * the mock client. The backend's model differs in places: wallets are their
 * own resource, lists carry no total, and it builds and submits the payment
 * transaction itself. Those differences are absorbed here and in map.ts.
 */
export function createLiveApi({
  appUrl,
  network,
  ...transport
}: LiveApiOptions): PayViaApi {
  const request = createTransport({ ...transport, toError: toApiError });
  const nothing = z.unknown();

  const post = <T>(schema: z.ZodType<T>, path: string, body?: unknown) =>
    request(schema, path, { method: "POST", body });

  const wallets = async () =>
    (await request(walletListDto, "/v1/wallets")).data;

  const merchant = (dto: MerchantDto, list: WalletDto[]): Merchant =>
    merchantSchema.parse(toMerchant(dto, list, network));

  const me = async () => {
    const [dto, list] = await Promise.all([
      request(merchantDto, "/v1/me"),
      wallets(),
    ]);
    return merchant(dto, list);
  };

  // Adding or removing a wallet changes where money goes, so the backend asks
  // for the account password with it.
  const addWallet = async (address: string, password?: string) => {
    try {
      return await post(walletDto, "/v1/wallets", {
        address,
        currentPassword: password,
      });
    } catch (error) {
      // Added from another tab or device in the meantime.
      if (error instanceof ApiError && error.code === "wallet_exists") {
        const existing = (await wallets()).find((w) => w.address === address);
        if (existing) return existing;
      }
      throw error;
    }
  };

  /** The id of the merchant's wallet with this address, adding it if new. */
  const walletIdFor = async (address: string, password?: string) =>
    (
      (await wallets()).find((w) => w.address === address) ??
      (await addWallet(address, password))
    ).id;

  /** Makes this address the wallet new requests are paid to. */
  const setReceivingWallet = async (address: string, password?: string) => {
    const list = await wallets();
    if (receivingWallet(list)?.address === address) return;
    // The newest wallet is the receiving one, so an older entry for the same
    // address is removed and added again.
    const older = list.find((w) => w.address === address);
    if (older) {
      await request(nothing, `/v1/wallets/${older.id}`, {
        method: "DELETE",
        body: { currentPassword: password },
      });
    }
    await addWallet(address, password);
  };

  return {
    auth: {
      login: async (input) => {
        const session = await post(authSessionDto, "/v1/auth/login", input);
        return merchant(session.merchant, await wallets());
      },
      signup: async ({ name, email, password, captcha_token }) => {
        const session = await post(authSessionDto, "/v1/auth/register", {
          email,
          password,
          businessName: name,
          // The sign-up form cannot be submitted without the terms accepted.
          acceptTerms: true,
          captchaToken: captcha_token,
        });
        return merchant(session.merchant, []);
      },
      logout: async () => {
        await post(nothing, "/v1/auth/logout");
        return { ok: true as const };
      },
      me,
      verifyEmail: async (token) => {
        await post(nothing, "/v1/auth/verify-email", { token });
      },
      resendVerification: async () => {
        await post(nothing, "/v1/auth/verify-email/resend");
      },
      forgotPassword: async ({ email, captcha_token }) => {
        await post(nothing, "/v1/auth/forgot-password", {
          email,
          captchaToken: captcha_token,
        });
      },
      resetPassword: async ({ token, new_password }) => {
        await post(nothing, "/v1/auth/reset-password", {
          token,
          newPassword: new_password,
        });
      },
      confirmEmailChange: async (token) => {
        await post(nothing, "/v1/auth/confirm-email-change", { token });
      },
      logoutAll: async () => {
        await post(nothing, "/v1/auth/logout-all");
      },
    },

    account: {
      changePassword: async ({ current_password, new_password }) => {
        await post(nothing, "/v1/me/password", {
          currentPassword: current_password,
          newPassword: new_password,
        });
      },
      changeEmail: async ({ current_password, new_email }) => {
        await post(nothing, "/v1/me/email", {
          currentPassword: current_password,
          newEmail: new_email,
        });
      },
      sessions: async () =>
        z
          .array(sessionSchema)
          .parse(toSessions(await request(sessionListDto, "/v1/me/sessions"))),
      endSession: async (sessionId) => {
        await request(nothing, `/v1/me/sessions/${sessionId}`, {
          method: "DELETE",
        });
      },
      delete: async (currentPassword) => {
        await request(nothing, "/v1/me", {
          method: "DELETE",
          body: { currentPassword, confirm: "DELETE" },
        });
      },
    },

    merchant: {
      // `logo_url` is ignored: the backend stores no logo yet.
      update: async ({
        business_name,
        recipient_wallet,
        current_password,
        notify_payments,
      }) => {
        if (business_name !== undefined || notify_payments !== undefined) {
          // The name is required on every update, so it is sent back as is
          // when only the notification setting changes.
          const businessName =
            business_name ??
            (await request(merchantDto, "/v1/me")).businessName;
          await request(merchantDto, "/v1/me", {
            method: "PATCH",
            body: { businessName, notifyPayments: notify_payments },
          });
        }
        if (recipient_wallet) {
          await setReceivingWallet(recipient_wallet, current_password);
        }
        return me();
      },
    },

    payments: {
      list: async (params = {}, signal) => {
        const query = new URLSearchParams();
        const filtered = Boolean(
          (params.status && params.status !== "ALL") || params.q,
        );
        if (params.status && params.status !== "ALL") {
          // A request being confirmed is still awaiting payment.
          query.set(
            "status",
            params.status === "PENDING" ? "PENDING,PROCESSING" : params.status,
          );
        }
        if (params.q) query.set("q", params.q);
        query.set("limit", String(params.limit ?? MAX_PAGE));

        const page = await request(
          paymentRequestListDto,
          `/v1/payment-requests?${query}`,
          { signal },
        );
        // No total is sent. When a filter finds nothing, one more row tells an
        // empty account from an empty result.
        const total =
          page.data.length === 0 && filtered
            ? (
                await request(
                  paymentRequestListDto,
                  "/v1/payment-requests?limit=1",
                  { signal },
                )
              ).data.length
            : page.data.length;

        return paymentListSchema.parse({
          items: page.data.map(toPaymentSummary),
          total,
        });
      },

      get: async (paymentId) => {
        if (!UUID.test(paymentId)) throw errors.notFound();
        const dto = await request(
          paymentRequestDto,
          `/v1/payment-requests/${paymentId}`,
        );
        return paymentSchema.parse(toPayment(dto));
      },

      create: async (input) => {
        const walletId = await walletIdFor(
          input.recipient_wallet,
          input.current_password,
        );
        const dto = await request(paymentRequestDto, "/v1/payment-requests", {
          method: "POST",
          // One key per submission, so a retried request cannot create two.
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: {
            amount: input.amount,
            assetCode: input.asset,
            walletId,
            description: input.description,
            customerName: input.customer_name || undefined,
            customerEmail: input.customer_email || undefined,
            note: input.note || undefined,
            reference: input.reference || undefined,
            dueDate: input.due_date || undefined,
            // Left out, the backend applies its default of seven days.
            expiresAt:
              input.expiry === "24H"
                ? new Date(Date.now() + DAY).toISOString()
                : undefined,
          },
        });
        return paymentSchema.parse(toPayment(dto));
      },

      cancel: async (paymentId) => {
        const dto = await post(
          paymentRequestDto,
          `/v1/payment-requests/${paymentId}/cancel`,
        );
        return paymentSchema.parse(toPayment(dto));
      },

      summary: async () =>
        summarySchema.parse(
          toSummary(
            await request(dashboardSummaryDto, "/v1/dashboard/summary"),
          ),
        ),

      sendEmail: async (paymentId) =>
        (
          await post(
            emailSentDto,
            `/v1/payment-requests/${paymentId}/send-email`,
          )
        ).sentTo,

      exportCsv: async (params = {}) => {
        const query = new URLSearchParams();
        if (params.status && params.status !== "ALL") {
          query.set(
            "status",
            params.status === "PENDING" ? "PENDING,PROCESSING" : params.status,
          );
        }
        if (params.q) query.set("q", params.q);
        const suffix = query.size ? `?${query}` : "";
        return request(z.string(), `/v1/payment-requests/export${suffix}`, {
          text: true,
        });
      },

      prepareRefund: async (paymentId, attemptId, input = {}) =>
        preparedRefundSchema.parse(
          toPreparedRefund(
            await post(
              preparedRefundDto,
              `/v1/payment-requests/${paymentId}/attempts/${attemptId}/refunds`,
              {
                amount: input.amount || undefined,
                destination: input.destination || undefined,
                memo: input.memo || undefined,
              },
            ),
          ),
        ),

      submitRefund: async (paymentId, refundId, signedXdr) =>
        refundSchema.parse(
          toRefund(
            await post(
              refundDto,
              `/v1/payment-requests/${paymentId}/refunds/${refundId}/submit`,
              { signedXdr },
            ),
          ),
        ),

      recordRefund: async (paymentId, attemptId, transactionHash) =>
        refundSchema.parse(
          toRefund(
            await post(
              refundDto,
              `/v1/payment-requests/${paymentId}/attempts/${attemptId}/refunds/record`,
              { txHash: transactionHash },
            ),
          ),
        ),
    },

    checkout: (() => {
      const path = (slug: string, rest = "") => {
        if (!PUBLIC_ID.test(slug)) throw errors.notFound();
        return `/v1/public/payment-requests/${slug}${rest}`;
      };
      const get = async (slug: string) =>
        publicPaymentSchema.parse(
          toPublicPayment(
            await request(publicPaymentRequestDto, path(slug)),
            appUrl,
          ),
        );

      return {
        get,
        status: async (slug) =>
          checkoutStatusSchema.parse(
            toCheckoutStatus(
              await request(publicPaymentStatusDto, path(slug, "/status")),
            ),
          ),
        prepare: async (slug, customerWallet) =>
          preparedPaymentSchema.parse(
            toPreparedPayment(
              await post(preparedPaymentDto, path(slug, "/prepare"), {
                customerAddress: customerWallet,
              }),
            ),
          ),
        submit: async (slug, input) =>
          submitResultSchema.parse(
            toSubmitResult(
              await post(submitResultDto, path(slug, "/submit"), {
                attemptId: input.attempt_id,
                signedXdr: input.signed_xdr,
              }),
            ),
          ),
        // The backend submits the transaction itself, so there is nothing to
        // report; this only re-reads the request.
        reportSubmitted: (slug) => get(slug),
      };
    })(),
  };
}
