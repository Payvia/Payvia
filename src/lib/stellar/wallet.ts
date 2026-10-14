export type WalletId = "freighter" | "albedo" | "demo";

export type WalletErrorKind =
  | "not_installed"
  | "rejected"
  /** The browser stopped the wallet from opening its window. */
  | "blocked"
  | "failed";

export class WalletError extends Error {
  constructor(
    readonly kind: WalletErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "WalletError";
  }
}

/**
 * What checkout needs from a wallet. Freighter and Albedo each implement it;
 * adding another wallet means writing another.
 */
export interface WalletAdapter {
  id: WalletId;
  /** Asks the wallet for access and returns the customer's public key. */
  connect(): Promise<string>;
  /** The network the wallet is currently set to. */
  getNetworkPassphrase(): Promise<string>;
  /** Asks the customer to approve, and returns the signed transaction XDR. */
  signTransaction(
    xdr: string,
    options: { networkPassphrase: string; address: string },
  ): Promise<string>;
}
