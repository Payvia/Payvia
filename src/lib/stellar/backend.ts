import { api, ApiError } from "@/lib/api";
import type { PublicPayment } from "@/lib/api/schemas";
import { BASE_FEE_STROOPS } from "./config";
import type { Problem } from "./problems";
import { stroopsToXlm, type PaymentRail } from "./rail";
import { GENERIC_SUBMIT_MESSAGE, SubmitError } from "./submit-errors";

// The rail used with the live backend. PayVia checks the customer's wallet,
// builds the transaction and submits the signed result itself, so nothing here
// talks to Stellar and the Stellar SDK is never loaded.

type Prepared = {
  /** Request and paying wallet the transaction was built for. */
  key: string;
  slug: string;
  attemptId: string;
  xdr: string;
  expiresAt: number;
};

/** A prepared transaction is reused only while this much signing time is left. */
const MIN_TIME_TO_SIGN_MS = 90_000;

/** Why the backend refused to prepare a payment, as a review-step problem. */
const problems: Record<string, Problem> = {
  invalid_address: "account_not_found",
  account_not_found: "account_not_found",
  no_trustline: "no_trustline",
  insufficient_balance: "insufficient_balance",
  insufficient_xlm_for_fee: "insufficient_xlm",
  self_payment: "self_payment",
  payments_paused: "paused",
};

const UNCERTAIN_MESSAGE =
  "We could not confirm that your payment was sent. It may still go through; we are checking.";

// One checkout per page, so the transaction prepared during review is kept
// here for the approve step.
let prepared: Prepared | null = null;

async function prepare(payment: PublicPayment, source: string) {
  const result = await api.checkout.prepare(payment.slug, source);
  prepared = {
    key: `${payment.slug}:${source}`,
    slug: payment.slug,
    attemptId: result.attempt_id,
    xdr: result.xdr,
    expiresAt: new Date(result.expires_at).getTime(),
  };
  return result;
}

export const backendRail: PaymentRail = {
  async preflight(payment, source) {
    try {
      return { fee: (await prepare(payment, source)).fee };
    } catch (error) {
      const problem = error instanceof ApiError && problems[error.code];
      // Anything else (request no longer payable, outage) is for the caller.
      if (!problem) throw error;
      return { fee: stroopsToXlm(BASE_FEE_STROOPS), problem };
    }
  },

  async build(payment, source) {
    const reusable =
      prepared?.key === `${payment.slug}:${source}` &&
      prepared.expiresAt - Date.now() > MIN_TIME_TO_SIGN_MS;
    if (!reusable) await prepare(payment, source);
    return prepared!.xdr;
  },

  async submit(signedXdr) {
    const attempt = prepared;
    // A signed transaction is submitted once; a retry prepares a new one.
    prepared = null;
    if (!attempt) throw new SubmitError(GENERIC_SUBMIT_MESSAGE);

    try {
      const result = await api.checkout.submit(attempt.slug, {
        attempt_id: attempt.attemptId,
        signed_xdr: signedXdr,
      });
      return result.transaction_hash;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      // No verdict (connection lost, outage, a submission already running):
      // Stellar may still accept the payment, so keep checking.
      const uncertain =
        error.status === 0 ||
        error.code === "attempt_in_progress" ||
        (error.status >= 500 && error.code !== "payments_paused");
      throw new SubmitError(
        uncertain ? UNCERTAIN_MESSAGE : error.message,
        uncertain,
      );
    }
  },
};
