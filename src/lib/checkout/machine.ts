import type { PaymentStatus } from "@/lib/api/schemas";
import type { Problem } from "@/lib/stellar/problems";
import type { WalletId } from "@/lib/stellar/wallet";

/**
 * The customer's progress through checkout. This is local state only: what
 * the customer has done in this tab. `resolvePhase` combines it with the
 * payment's status from the backend, which always has the final say.
 */
export type Step =
  | "idle"
  | "connected"
  | "reviewing"
  | "signing"
  | "submitting"
  | "confirming"
  /** Handed off to a wallet app (SEP-7); waiting for the payment to appear. */
  | "external"
  | "failed";

export type SheetIssue = "rejected" | "not_installed" | "blocked";

export type CheckoutState = {
  step: Step;
  wallet?: WalletId;
  address?: string;
  /** Network fee in XLM, known once the review checks have run. */
  fee?: string;
  /** True while wallet and balance checks are running. */
  checking: boolean;
  problem?: Problem;
  hash?: string;
  failure?: string;
  sheet: {
    open: boolean;
    connecting?: WalletId;
    issue?: SheetIssue;
    /** Which wallet the issue is about. */
    issueWallet?: WalletId;
  };
};

export type CheckoutEvent =
  | { type: "OPEN_WALLETS" }
  | { type: "CLOSE_WALLETS" }
  | { type: "CONNECT_START"; wallet: WalletId }
  | { type: "CONNECT_FAILED"; wallet: WalletId; issue: SheetIssue }
  | { type: "CONNECTED"; wallet: WalletId; address: string }
  | { type: "DISCONNECT" }
  | { type: "REVIEW_START" }
  | { type: "REVIEW_READY"; fee: string; problem?: Problem }
  | { type: "REVIEW_BACK" }
  | { type: "APPROVE" }
  | { type: "SIGN_CANCELLED" }
  | { type: "SIGNED" }
  | { type: "SUBMITTED"; hash?: string }
  | { type: "EXTERNAL_START" }
  | { type: "EXTERNAL_BACK" }
  | { type: "FAIL"; reason: string }
  | { type: "RETRY" };

export const initialState: CheckoutState = {
  step: "idle",
  checking: false,
  sheet: { open: false },
};

const closed = { open: false } as const;

export function checkoutReducer(
  state: CheckoutState,
  event: CheckoutEvent,
): CheckoutState {
  switch (event.type) {
    case "OPEN_WALLETS":
      return state.step === "idle"
        ? { ...state, sheet: { open: true } }
        : state;

    case "CLOSE_WALLETS":
      return { ...state, sheet: closed };

    case "CONNECT_START":
      return state.step === "idle"
        ? { ...state, sheet: { open: true, connecting: event.wallet } }
        : state;

    case "CONNECT_FAILED":
      // Stay on the sheet so the customer can retry or pick another wallet.
      return state.step === "idle"
        ? {
            ...state,
            sheet: {
              open: true,
              issue: event.issue,
              issueWallet: event.wallet,
            },
          }
        : state;

    case "CONNECTED":
      return state.step === "idle"
        ? {
            ...state,
            step: "connected",
            wallet: event.wallet,
            address: event.address,
            sheet: closed,
          }
        : state;

    case "DISCONNECT":
      // Not while a payment is in flight.
      return state.step === "connected" || state.step === "reviewing"
        ? initialState
        : state;

    case "REVIEW_START":
      return state.step === "connected" || state.step === "reviewing"
        ? { ...state, step: "reviewing", checking: true, problem: undefined }
        : state;

    case "REVIEW_READY":
      return state.step === "reviewing"
        ? { ...state, checking: false, fee: event.fee, problem: event.problem }
        : state;

    case "REVIEW_BACK":
      return state.step === "reviewing"
        ? { ...state, step: "connected", checking: false, problem: undefined }
        : state;

    case "APPROVE":
      // The guard against double payment: only a clean review can be approved.
      return state.step === "reviewing" &&
        !state.checking &&
        !state.problem &&
        state.fee
        ? { ...state, step: "signing" }
        : state;

    case "SIGN_CANCELLED":
      return state.step === "signing" ? { ...state, step: "reviewing" } : state;

    case "SIGNED":
      return state.step === "signing"
        ? { ...state, step: "submitting" }
        : state;

    case "SUBMITTED":
      return state.step === "submitting" || state.step === "signing"
        ? { ...state, step: "confirming", hash: event.hash }
        : state;

    case "EXTERNAL_START":
      return state.step === "idle"
        ? { ...state, step: "external", sheet: closed }
        : state;

    case "EXTERNAL_BACK":
      return state.step === "external" ? initialState : state;

    case "FAIL":
      return state.step === "signing" ||
        state.step === "submitting" ||
        state.step === "reviewing"
        ? { ...state, step: "failed", failure: event.reason }
        : state;

    case "RETRY":
      if (state.step !== "failed") return state;
      // Keep the wallet connected and run the checks again.
      return state.address
        ? {
            ...state,
            step: "reviewing",
            checking: true,
            problem: undefined,
            failure: undefined,
            hash: undefined,
          }
        : initialState;
  }
}

/** What the page shows. Terminal phases come from the backend's status. */
export type Phase =
  | Step
  /** Someone is paying this request right now, in another tab or device. */
  | "in_progress"
  | "paid"
  | "already_paid"
  | "expired"
  | "cancelled";

const paying: Step[] = ["signing", "submitting", "confirming", "external"];

/**
 * Combines local progress with the backend's status. The backend wins:
 * a request that is paid, expired or cancelled shows that, whatever this tab
 * was doing.
 */
export function resolvePhase(
  state: CheckoutState,
  status: PaymentStatus,
  /** Reason the backend gave for a failed payment. */
  serverFailure?: string,
): { phase: Phase; failure?: string } {
  const involved = paying.includes(state.step);

  switch (status) {
    case "PAID":
      // "Paid" for the customer who just paid, "already paid" for anyone else.
      return { phase: involved ? "paid" : "already_paid" };
    case "EXPIRED":
      return { phase: "expired" };
    case "CANCELLED":
      return { phase: "cancelled" };
    case "PROCESSING":
      if (state.step === "failed")
        return { phase: "failed", failure: state.failure };
      return { phase: involved ? "confirming" : "in_progress" };
    case "FAILED":
      // The backend rejected what this tab submitted.
      if (state.step === "confirming") {
        return {
          phase: "failed",
          failure: serverFailure ?? "Stellar could not confirm this payment.",
        };
      }
      return { phase: state.step, failure: state.failure };
    case "CREATED":
    case "PENDING":
      return { phase: state.step, failure: state.failure };
  }
}

/** Phases where the hero and sheet show the payable request. */
export function isActivePhase(phase: Phase) {
  return (
    phase === "idle" ||
    phase === "connected" ||
    phase === "reviewing" ||
    phase === "signing" ||
    phase === "submitting" ||
    phase === "confirming" ||
    phase === "external" ||
    phase === "in_progress"
  );
}
