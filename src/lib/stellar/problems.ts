/** Something that stops a payment before the customer is asked to sign. */
export type Problem =
  | "wrong_network"
  | "account_not_found"
  | "no_trustline"
  | "insufficient_balance"
  | "insufficient_xlm"
  | "merchant_not_found"
  | "merchant_no_trustline"
  | "self_payment"
  | "paused"
  | "check_failed";

type Copy = { title: string; body: string };

export function problemCopy(
  problem: Problem,
  ctx: { amount: string; asset: string; merchant: string; network: string },
): Copy {
  switch (problem) {
    case "insufficient_balance":
      return {
        title: "Insufficient balance",
        body: `Your wallet doesn't have enough ${ctx.asset} to pay ${ctx.amount}. Add funds before approving.`,
      };
    case "no_trustline":
      return {
        title: `Your wallet can't hold ${ctx.asset} yet`,
        body: `Add ${ctx.asset} as an asset (a trustline) in your wallet, fund it, then try again.`,
      };
    case "insufficient_xlm":
      return {
        title: "Not enough XLM for the network fee",
        body: "Add a small amount of XLM to your wallet to cover the Stellar network fee.",
      };
    case "account_not_found":
      return {
        title: "This wallet isn't active yet",
        body: `It has no funds on ${ctx.network}. Fund the wallet, or connect a different one.`,
      };
    case "wrong_network":
      return {
        title: "Wrong network",
        body: `Switch your wallet to ${ctx.network}, then try again.`,
      };
    case "merchant_not_found":
    case "merchant_no_trustline":
      return {
        title: `${ctx.merchant} can't receive this payment yet`,
        body: `Their wallet isn't set up to receive ${ctx.asset}. Contact ${ctx.merchant} before paying.`,
      };
    case "self_payment":
      return {
        title: "This is the wallet being paid",
        body: `${ctx.merchant} receives this payment in the wallet you connected. Connect a different wallet to pay.`,
      };
    case "paused":
      return {
        title: "Payments are paused",
        body: "PayVia is not taking payments for the moment. Please try again later.",
      };
    case "check_failed":
      return {
        title: "We couldn't check your wallet",
        body: "Stellar didn't respond. Check your connection and try again.",
      };
  }
}

/** The customer can fix these and re-check without reconnecting. */
export function isRecoverable(problem: Problem) {
  return (
    problem !== "merchant_not_found" && problem !== "merchant_no_trustline"
  );
}
