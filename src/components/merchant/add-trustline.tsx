"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { stellar } from "@/lib/stellar/config";
import { isValidPublicKey } from "@/lib/stellar/strkey";
import {
  addTrustline,
  TrustlineError,
  type TrustlineAsset,
} from "@/lib/stellar/trustline";

/** True when saving a wallet failed because it cannot hold USDC yet. */
export function isMissingTrustline(error: unknown) {
  return error instanceof ApiError && error.code === "no_trustline";
}

/**
 * The asset the backend said the wallet is missing. It is the one that
 * decides, so its answer is used over this app's own configuration.
 */
function missingAsset(error: unknown): TrustlineAsset {
  const asset = error instanceof ApiError ? error.details.asset : undefined;
  const { code, issuer } = (asset ?? {}) as Partial<TrustlineAsset>;
  return typeof code === "string" &&
    typeof issuer === "string" &&
    isValidPublicKey(issuer)
    ? { code, issuer }
    : stellar.usdc;
}

/**
 * Shown in place of the error when a receiving wallet has no USDC trustline.
 * Adds one from the merchant's wallet, then lets the form save again.
 */
export function AddTrustline({
  error,
  address,
  onAdded,
}: {
  /** The refusal, from `isMissingTrustline`. */
  error: unknown;
  /** The wallet that was refused. */
  address: string;
  /** The wallet can now receive USDC: retry what failed. */
  onAdded: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [problem, setProblem] = useState<string>();

  async function add() {
    setAdding(true);
    setProblem(undefined);
    try {
      await addTrustline(address, missingAsset(error));
      onAdded();
    } catch (error) {
      setProblem(
        error instanceof TrustlineError
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <Banner title="This wallet cannot hold USDC yet">
      <p>
        It needs a USDC trustline on {stellar.networkLabel} before it can be
        paid. You can add it now from Freighter. It reserves 0.5 XLM in the
        wallet.
      </p>
      {problem ? (
        <p role="alert" className="mt-2 text-danger-ink">
          {problem}
        </p>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        loading={adding}
        onClick={add}
      >
        Add USDC to this wallet
      </Button>
    </Banner>
  );
}
