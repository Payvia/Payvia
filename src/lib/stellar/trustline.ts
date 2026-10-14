import { BASE_FEE_STROOPS, stellar, TX_TIMEOUT_SECONDS } from "./config";
import { freighter } from "./freighter";
import { WalletError, type WalletAdapter } from "./wallet";

// A Stellar account can only hold an asset it has opted into: a trustline.
// Only the account's owner can add one, so the merchant signs it in their
// wallet and it is sent to Stellar from here.

/** Why the trustline was not added, worded for the merchant. */
export class TrustlineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrustlineError";
  }
}

const loadSdk = () => import("@stellar/stellar-sdk");

const short = (address: string) =>
  `${address.slice(0, 4)}…${address.slice(-4)}`;

type HorizonFailure = {
  response?: {
    status?: number;
    data?: {
      extras?: {
        result_codes?: { transaction?: string; operations?: string[] };
      };
    };
  };
};

function isNotFound(error: unknown) {
  return (
    (error as HorizonFailure)?.response?.status === 404 ||
    (error as Error)?.name === "NotFoundError"
  );
}

/** Each trustline locks 0.5 XLM in the account. */
const LOW_XLM =
  "This wallet needs a little more XLM. Adding USDC reserves 0.5 XLM, plus a small network fee.";

function messageForSubmit(error: unknown) {
  const codes = (error as HorizonFailure)?.response?.data?.extras?.result_codes;
  if (!codes) {
    return "We could not reach Stellar. Check your connection and try again.";
  }
  if (
    codes.operations?.includes("op_low_reserve") ||
    codes.transaction === "tx_insufficient_balance"
  ) {
    return LOW_XLM;
  }
  if (codes.transaction === "tx_bad_auth") {
    return "The signature did not match this wallet. Please try again.";
  }
  if (codes.transaction === "tx_too_late") {
    return "The approval took too long. Please try again.";
  }
  return "Stellar could not add USDC to this wallet. Please try again.";
}

export type TrustlineAsset = { code: string; issuer: string };

/**
 * Adds a trustline for `asset` to `address`, signed in the merchant's wallet.
 * Resolves once the wallet can receive the asset; throws a TrustlineError
 * otherwise.
 */
export async function addTrustline(
  address: string,
  asset: TrustlineAsset = stellar.usdc,
  wallet: WalletAdapter = freighter,
): Promise<void> {
  let connected: string;
  let passphrase: string;
  try {
    connected = await wallet.connect();
    passphrase = await wallet.getNetworkPassphrase();
  } catch (error) {
    const kind = error instanceof WalletError ? error.kind : "failed";
    throw new TrustlineError(
      kind === "not_installed"
        ? "Freighter was not found in this browser. Open the wallet that holds this address and add USDC there, then try again."
        : kind === "rejected"
          ? "The connection was rejected in your wallet. Try again."
          : "We could not read your wallet. Please try again.",
    );
  }

  if (connected !== address) {
    throw new TrustlineError(
      `Freighter is on a different account (${short(connected)}). Switch it to ${short(address)}, then try again.`,
    );
  }
  if (passphrase !== stellar.passphrase) {
    throw new TrustlineError(
      `Switch Freighter to ${stellar.networkLabel}, then try again.`,
    );
  }

  const sdk = await loadSdk();
  const horizon = new sdk.Horizon.Server(stellar.horizonUrl);

  let account;
  try {
    account = await horizon.loadAccount(address);
  } catch (error) {
    throw new TrustlineError(
      isNotFound(error)
        ? `This wallet is not active on ${stellar.networkLabel} yet. Fund it with XLM, then try again.`
        : "We could not reach Stellar. Check your connection and try again.",
    );
  }

  const { code, issuer } = asset;
  const exists = account.balances.some(
    (b) =>
      "asset_code" in b && b.asset_code === code && b.asset_issuer === issuer,
  );
  // Added elsewhere in the meantime: nothing left to sign.
  if (exists) return;

  let fee = BASE_FEE_STROOPS;
  try {
    fee = Math.max(await horizon.fetchBaseFee(), BASE_FEE_STROOPS);
  } catch {
    // The base fee is enough outside of congestion.
  }

  const xdr = new sdk.TransactionBuilder(account, {
    fee: String(fee),
    networkPassphrase: stellar.passphrase,
  })
    .addOperation(
      sdk.Operation.changeTrust({ asset: new sdk.Asset(code, issuer) }),
    )
    .setTimeout(TX_TIMEOUT_SECONDS)
    .build()
    .toXDR();

  let signed: string;
  try {
    signed = await wallet.signTransaction(xdr, {
      networkPassphrase: stellar.passphrase,
      address,
    });
  } catch {
    throw new TrustlineError(
      "The request was not approved in your wallet. Try again.",
    );
  }

  try {
    await horizon.submitTransaction(
      sdk.TransactionBuilder.fromXDR(signed, stellar.passphrase),
    );
  } catch (error) {
    throw new TrustlineError(messageForSubmit(error));
  }
}
