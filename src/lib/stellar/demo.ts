import { DEMO_CUSTOMER_WALLET } from "@/lib/api/mock/seed";
import { BASE_FEE_STROOPS, stellar } from "./config";
import { stroopsToXlm, type PaymentRail } from "./rail";
import { SubmitError } from "./submit-errors";
import { WalletError, type WalletAdapter } from "./wallet";

// A pretend wallet and a pretend Stellar network, for mock mode only. They
// let the whole checkout be clicked through and tested without Freighter or
// funded Testnet accounts. Nothing here touches a real network.

export const demoScenarios = [
  "reject-connect",
  "not-installed",
  "insufficient",
  "no-trustline",
  "wrong-network",
  "reject-sign",
  "slow-sign",
  "submit-fail",
  "submit-timeout",
] as const;
export type DemoScenario = (typeof demoScenarios)[number];

/** `?demo=reject-sign` on the payment URL picks a failure to rehearse. */
export function readDemoScenario(search: string): DemoScenario | null {
  const value = new URLSearchParams(search).get("demo");
  return demoScenarios.includes(value as DemoScenario)
    ? (value as DemoScenario)
    : null;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function randomHash() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function createDemoWallet(scenario: DemoScenario | null): WalletAdapter {
  return {
    id: "demo",
    async connect() {
      await pause(500);
      if (scenario === "not-installed") {
        throw new WalletError("not_installed", "Wallet is not installed.");
      }
      if (scenario === "reject-connect") {
        throw new WalletError("rejected", "The connection was rejected.");
      }
      return DEMO_CUSTOMER_WALLET;
    },
    async getNetworkPassphrase() {
      return scenario === "wrong-network"
        ? "Public Global Stellar Network ; September 2015"
        : stellar.passphrase;
    },
    async signTransaction(xdr) {
      // "slow-sign" leaves time to cancel, as with a real wallet prompt.
      await pause(scenario === "slow-sign" ? 8000 : 1200);
      if (scenario === "reject-sign") {
        throw new WalletError("rejected", "The payment was not approved.");
      }
      return xdr;
    },
  };
}

export function createDemoRail(scenario: DemoScenario | null): PaymentRail {
  return {
    async preflight() {
      await pause(400);
      const fee = stroopsToXlm(BASE_FEE_STROOPS);
      if (scenario === "insufficient") {
        return { fee, problem: "insufficient_balance" };
      }
      if (scenario === "no-trustline") return { fee, problem: "no_trustline" };
      return { fee };
    },
    async build(payment) {
      return `demo-transaction:${payment.payment_id}`;
    },
    async submit() {
      await pause(600);
      if (scenario === "submit-fail") {
        throw new SubmitError("Your wallet does not have enough USDC.");
      }
      const hash = randomHash();
      if (scenario === "submit-timeout") {
        throw new SubmitError(
          "We could not reach Stellar. Your payment may still go through; we are checking.",
          true,
          hash,
        );
      }
      return hash;
    },
  };
}
