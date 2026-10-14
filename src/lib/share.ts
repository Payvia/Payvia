import type { PaymentSummary } from "@/lib/api/schemas";

type Shareable = Pick<
  PaymentSummary,
  "amount" | "asset" | "description" | "payment_url"
>;
import { formatAssetAmount } from "@/lib/format";

/** Text sent alongside a payment link. */
export function shareMessage(payment: Shareable, merchantName: string) {
  return `${merchantName} is requesting ${formatAssetAmount(payment.amount, payment.asset)} for ${payment.description}. Pay securely with PayVia: ${payment.payment_url}`;
}

export function whatsAppUrl(payment: Shareable, merchantName: string) {
  return `https://wa.me/?text=${encodeURIComponent(shareMessage(payment, merchantName))}`;
}

export function explorerTxUrl(explorerUrl: string, hash: string) {
  return `${explorerUrl.replace(/\/$/, "")}/tx/${hash}`;
}
