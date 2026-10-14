import { WalletError, type WalletAdapter } from "./wallet";

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

// Loaded on demand so the payment page stays light until a wallet is chosen.
const load = () => import("@stellar/freighter-api");

function message(error: unknown) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

export const freighter: WalletAdapter = {
  id: "freighter",

  async connect() {
    const api = await load();
    const status = await api.isConnected();
    if (status.error || !status.isConnected) {
      throw new WalletError("not_installed", "Freighter is not installed.");
    }
    const access = await api.requestAccess();
    if (access.error || !access.address) {
      throw new WalletError(
        "rejected",
        message(access.error) || "The connection was rejected.",
      );
    }
    return access.address;
  },

  async getNetworkPassphrase() {
    const api = await load();
    const details = await api.getNetworkDetails();
    if (details.error) {
      throw new WalletError("failed", message(details.error));
    }
    return details.networkPassphrase;
  },

  async signTransaction(xdr, options) {
    const api = await load();
    const result = await api.signTransaction(xdr, options);
    if (result.error || !result.signedTxXdr) {
      throw new WalletError(
        "rejected",
        message(result.error) || "The payment was not approved.",
      );
    }
    return result.signedTxXdr;
  },
};
