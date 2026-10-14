"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducer, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { pollInterval, queries } from "@/lib/api/queries";
import type { PublicPayment } from "@/lib/api/schemas";
import {
  checkoutReducer,
  initialState,
  resolvePhase,
} from "@/lib/checkout/machine";
import { env } from "@/lib/env";
import { BASE_FEE_STROOPS, stellar } from "@/lib/stellar/config";
import { stroopsToXlm, type PaymentRail } from "@/lib/stellar/rail";
import { sep7PayUri } from "@/lib/stellar/sep7";
import { SubmitError } from "@/lib/stellar/submit-errors";
import {
  WalletError,
  type WalletAdapter,
  type WalletId,
} from "@/lib/stellar/wallet";
import { isPayable } from "@/lib/status";

/** The demo wallet exists only when the app runs against the mock API. */
export const demoWalletEnabled = env.apiMode === "mock";

const POPUP_BLOCKED =
  "Your browser blocked the wallet window. Allow pop-ups for this site, then try again.";

const SIGNATURE_FAILURE =
  "Your payment was not approved on time on your wallet or your signature did not match.";

// Wallet and network code is loaded when first needed, not with the page.
async function loadWallet(id: WalletId): Promise<{
  wallet: WalletAdapter;
  rail: PaymentRail;
}> {
  if (id === "demo" && demoWalletEnabled) {
    const demo = await import("@/lib/stellar/demo");
    const scenario = demo.readDemoScenario(window.location.search);
    return {
      wallet: demo.createDemoWallet(scenario),
      rail: demo.createDemoRail(scenario),
    };
  }
  // Against the live backend PayVia builds and submits the transaction. With
  // the mock API the browser does, straight to Stellar.
  const [wallet, rail] = await Promise.all([
    id === "albedo"
      ? import("@/lib/stellar/albedo").then((m) => m.albedo)
      : import("@/lib/stellar/freighter").then((m) => m.freighter),
    env.apiMode === "live"
      ? import("@/lib/stellar/backend").then((m) => m.backendRail)
      : import("@/lib/stellar/horizon").then((m) => m.horizonRail),
  ]);
  return { wallet, rail };
}

export function useCheckout(initial: PublicPayment) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);
  const queryClient = useQueryClient();
  // Bumped whenever the customer abandons an attempt, so late results from the
  // wallet are ignored.
  const attempt = useRef(0);

  const waiting = state.step === "confirming" || state.step === "external";
  const query = queries.checkout(initial.slug);
  const { data: payment, refetch } = useQuery({
    ...query,
    initialData: initial,
    refetchInterval: (q) =>
      waiting ? 3000 : pollInterval(q.state.data?.status),
  });

  const { phase, failure } = resolvePhase(
    state,
    payment.status,
    payment.failure_reason,
  );

  async function runChecks(walletId: WalletId, address: string) {
    const baseFee = stroopsToXlm(BASE_FEE_STROOPS);
    try {
      const { wallet, rail } = await loadWallet(walletId);
      const passphrase = await wallet.getNetworkPassphrase();
      if (passphrase !== stellar.passphrase) {
        dispatch({
          type: "REVIEW_READY",
          fee: baseFee,
          problem: "wrong_network",
        });
        return;
      }
      const result = await rail.preflight(payment, address);
      dispatch({ type: "REVIEW_READY", ...result });
    } catch {
      dispatch({ type: "REVIEW_READY", fee: baseFee, problem: "check_failed" });
      // The request itself may have changed (paid, cancelled, expired).
      void refetch();
    }
  }

  async function connect(walletId: WalletId) {
    dispatch({ type: "CONNECT_START", wallet: walletId });
    try {
      const { wallet } = await loadWallet(walletId);
      const address = await wallet.connect();
      dispatch({ type: "CONNECTED", wallet: walletId, address });
    } catch (error) {
      dispatch({
        type: "CONNECT_FAILED",
        wallet: walletId,
        issue:
          error instanceof WalletError &&
          (error.kind === "not_installed" || error.kind === "blocked")
            ? error.kind
            : "rejected",
      });
    }
  }

  function review() {
    if (!state.wallet || !state.address) return;
    dispatch({ type: "REVIEW_START" });
    void runChecks(state.wallet, state.address);
  }

  function retry() {
    dispatch({ type: "RETRY" });
    if (state.wallet && state.address) {
      void runChecks(state.wallet, state.address);
    }
  }

  async function approve() {
    const { wallet: walletId, address, fee } = state;
    if (
      state.step !== "reviewing" ||
      state.checking ||
      state.problem ||
      !walletId ||
      !address ||
      !fee
    ) {
      return;
    }
    const id = ++attempt.current;
    dispatch({ type: "APPROVE" });

    let hash: string | undefined;
    try {
      // The request may have been paid, cancelled or expired while the
      // customer was reading. Check before asking them to sign.
      const latest = await refetch();
      if (attempt.current !== id) return;
      if (!latest.data || !isPayable(latest.data.status)) {
        dispatch({ type: "SIGN_CANCELLED" });
        return;
      }

      const { wallet, rail } = await loadWallet(walletId);
      const xdr = await rail.build(latest.data, address, fee);
      const signed = await wallet.signTransaction(xdr, {
        networkPassphrase: stellar.passphrase,
        address,
      });
      if (attempt.current !== id) return;
      dispatch({ type: "SIGNED" });
      hash = await rail.submit(signed);
    } catch (error) {
      if (attempt.current !== id) return;
      if (error instanceof SubmitError && error.uncertain) {
        // Stellar may still accept it: keep checking instead of failing.
        hash = error.hash;
      } else {
        dispatch({
          type: "FAIL",
          reason:
            error instanceof SubmitError
              ? error.message
              : error instanceof WalletError
                ? error.kind === "blocked"
                  ? POPUP_BLOCKED
                  : SIGNATURE_FAILURE
                : error instanceof ApiError && error.status !== 0
                  ? error.message
                  : "Something went wrong before the payment was sent. Please try again.",
        });
        return;
      }
    }

    // An earlier failed attempt no longer describes this request. Drop it, and
    // any poll still in flight, before the page starts waiting on the status.
    await queryClient.cancelQueries({ queryKey: query.queryKey });
    queryClient.setQueryData(query.queryKey, (current) =>
      current?.status === "FAILED"
        ? { ...current, status: "PENDING" as const, failure_reason: undefined }
        : current,
    );
    dispatch({ type: "SUBMITTED", hash });
    if (!hash) return;
    try {
      const updated = await api.checkout.reportSubmitted(payment.slug, {
        transaction_hash: hash,
        customer_wallet: address,
      });
      queryClient.setQueryData(query.queryKey, updated);
    } catch {
      // The payment is on its way regardless; polling picks up the result.
    }
  }

  function cancelSigning() {
    attempt.current += 1;
    dispatch({ type: "SIGN_CANCELLED" });
  }

  function openWalletApp() {
    dispatch({ type: "EXTERNAL_START" });
    // The backend's link when it sends one: it is the one it will match.
    window.location.href = payment.sep7_uri ?? sep7PayUri(payment);
  }

  return {
    payment,
    state,
    phase,
    failure,
    openWallets: () => {
      dispatch({ type: "OPEN_WALLETS" });
      // Albedo opens a window, which browsers only allow right after a click:
      // have its code ready before the customer picks it.
      void import("@/lib/stellar/albedo").then((m) => m.preloadAlbedo());
    },
    closeWallets: () => dispatch({ type: "CLOSE_WALLETS" }),
    connect,
    disconnect: () => dispatch({ type: "DISCONNECT" }),
    review,
    backToDetails: () => dispatch({ type: "REVIEW_BACK" }),
    approve,
    cancelSigning,
    retry,
    openWalletApp,
    leaveWalletApp: () => dispatch({ type: "EXTERNAL_BACK" }),
  };
}

export type Checkout = ReturnType<typeof useCheckout>;
