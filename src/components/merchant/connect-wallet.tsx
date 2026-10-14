"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FREIGHTER_INSTALL_URL, freighter } from "@/lib/stellar/freighter";
import { WalletError, type WalletErrorKind } from "@/lib/stellar/wallet";

/**
 * Fills in a receiving wallet from Freighter, so the address does not have to
 * be copied by hand. Typing or pasting it stays possible: Freighter is a
 * desktop browser extension, and a merchant may be on a phone or keep their
 * funds in another wallet.
 */
export function ConnectWallet({
  onAddress,
  disabled,
}: {
  /** Called with the public key of the account selected in the wallet. */
  onAddress: (address: string) => void;
  disabled?: boolean;
}) {
  const [connecting, setConnecting] = useState(false);
  const [issue, setIssue] = useState<WalletErrorKind>();

  async function connect() {
    setConnecting(true);
    setIssue(undefined);
    try {
      onAddress(await freighter.connect());
    } catch (error) {
      setIssue(error instanceof WalletError ? error.kind : "failed");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          variant="outline"
          size="sm"
          loading={connecting}
          disabled={disabled}
          onClick={connect}
        >
          {connecting ? null : <Wallet className="size-3.5" aria-hidden />}
          Connect wallet
        </Button>
        <span className="text-xs text-muted">
          Use your Freighter address, or paste one above.
        </span>
      </div>
      {issue ? (
        <p role="alert" className="text-xs text-danger-ink">
          {issue === "not_installed" ? (
            <>
              Freighter was not found in this browser.{" "}
              <a
                href={FREIGHTER_INSTALL_URL}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Install Freighter
              </a>{" "}
              or paste your address.
            </>
          ) : issue === "rejected" ? (
            "The connection was rejected in your wallet. Try again."
          ) : (
            "We could not read your wallet. Try again, or paste your address."
          )}
        </p>
      ) : null}
    </div>
  );
}
