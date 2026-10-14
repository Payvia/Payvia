/** Raised when Stellar rejects a transaction or the outcome is unknown. */
export class SubmitError extends Error {
  constructor(
    message: string,
    /**
     * True when the transaction may still have been accepted (timeout,
     * dropped connection). The UI must keep checking instead of saying it failed.
     */
    readonly uncertain = false,
    /** Hash of the submitted transaction, when the outcome is uncertain. */
    readonly hash?: string,
  ) {
    super(message);
    this.name = "SubmitError";
  }
}

type ResultCodes = { transaction?: string; operations?: string[] };

const operationMessages: Record<string, string> = {
  op_underfunded: "Your wallet does not have enough USDC.",
  op_src_no_trust: "Your wallet is not set up to hold USDC.",
  op_src_not_authorized: "Your wallet is not authorised to send USDC.",
  op_no_trust:
    "The merchant's wallet cannot receive USDC yet. Contact the merchant.",
  op_not_authorized:
    "The merchant's wallet is not authorised to receive USDC. Contact the merchant.",
  op_no_destination: "The merchant's wallet was not found on Stellar.",
  op_line_full:
    "The merchant's wallet cannot receive this amount. Contact the merchant.",
};

const transactionMessages: Record<string, string> = {
  tx_too_late: "The approval took too long. Please try again.",
  tx_too_early: "Your device clock looks wrong. Check the time and try again.",
  tx_bad_seq: "Something changed in your wallet. Please try again.",
  tx_bad_auth: "The signature did not match your wallet. Please try again.",
  tx_insufficient_balance:
    "Your wallet does not have enough XLM for the network fee.",
  tx_insufficient_fee:
    "The Stellar network is busy. Please try again in a moment.",
  tx_no_source_account: "Your wallet is not active on this network.",
};

export const GENERIC_SUBMIT_MESSAGE =
  "Stellar could not complete this payment. Please try again.";

/** Turns Horizon result codes into something a customer can act on. */
export function messageForResultCodes(codes: ResultCodes | undefined): string {
  const operation = codes?.operations?.find((code) => code !== "op_success");
  if (operation && operationMessages[operation]) {
    return operationMessages[operation];
  }
  if (codes?.transaction && transactionMessages[codes.transaction]) {
    return transactionMessages[codes.transaction];
  }
  return GENERIC_SUBMIT_MESSAGE;
}

// Reasons the backend records when it rejects or cannot match a payment.
const backendMessages: Record<string, string> = {
  TX_NOT_FOUND_AFTER_EXPIRY:
    "Stellar did not receive the payment in time. Please try again.",
  WRONG_AMOUNT:
    "The payment sent did not match the amount requested. Contact the merchant before trying again.",
  WRONG_ASSET:
    "The payment was sent in the wrong asset. Contact the merchant before trying again.",
};

/** Message for a failed attempt's `failureCode` from the PayVia backend. */
export function messageForFailureCode(code: string | null | undefined): string {
  if (!code) return GENERIC_SUBMIT_MESSAGE;
  return (
    operationMessages[code] ??
    transactionMessages[code] ??
    backendMessages[code] ??
    GENERIC_SUBMIT_MESSAGE
  );
}
