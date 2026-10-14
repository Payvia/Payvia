import type { PublicPayment } from "@/lib/api/schemas";
import { stellar } from "./config";

/**
 * SEP-7 payment URI. Opening it hands the payment to a Stellar wallet app
 * installed on the device. PayVia cannot see the signing happen, so the page
 * then waits for the backend to spot the payment by its memo.
 */
export function sep7PayUri(
  payment: Pick<
    PublicPayment,
    "recipient_wallet" | "amount" | "asset" | "memo"
  >,
  config: { issuer: string; passphrase: string } = {
    issuer: stellar.usdc.issuer,
    passphrase: stellar.passphrase,
  },
): string {
  const params = new URLSearchParams({
    destination: payment.recipient_wallet,
    amount: payment.amount,
    asset_code: payment.asset,
    asset_issuer: config.issuer,
    memo: payment.memo,
    memo_type: "MEMO_TEXT",
    network_passphrase: config.passphrase,
  });
  // SEP-7 expects percent-encoding (%20), not form encoding (+).
  return `web+stellar:pay?${params.toString().replace(/\+/g, "%20")}`;
}
