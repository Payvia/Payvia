import type { PublicPayment } from "@/lib/api/schemas";
import type { Problem } from "./problems";

export type Preflight = {
  /** Network fee in XLM, for display: "0.00001". */
  fee: string;
  /** Set when the payment cannot go ahead. */
  problem?: Problem;
};

/**
 * The on-chain half of checkout: check the wallets, build the transaction,
 * submit it. `horizon` talks to Stellar; `demo` simulates it in mock mode.
 */
export interface PaymentRail {
  preflight(payment: PublicPayment, source: string): Promise<Preflight>;
  /** Unsigned transaction XDR for the wallet to sign. */
  build(payment: PublicPayment, source: string, fee: string): Promise<string>;
  /** Submits a signed transaction and returns its hash. */
  submit(signedXdr: string): Promise<string>;
}

const STROOPS_PER_XLM = 10_000_000;

/** 100 → "0.00001" */
export function stroopsToXlm(stroops: number): string {
  return (stroops / STROOPS_PER_XLM).toFixed(7).replace(/0+$/, "");
}

export function xlmToStroops(xlm: string): number {
  return Math.round(Number(xlm) * STROOPS_PER_XLM);
}
