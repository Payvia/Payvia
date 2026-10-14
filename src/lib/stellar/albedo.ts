import { stellar } from "./config";
import { WalletError, type WalletAdapter } from "./wallet";

// Albedo is a web wallet: it asks for approval in a small window of its own
// (albedo.link), so it needs no extension and also works on phones.

// Loaded on demand so the payment page stays light until a wallet is chosen.
const load = () => import("@albedo-link/intent").then((m) => m.default);

/** Starts loading Albedo, so its window can open the moment it is chosen. */
export function preloadAlbedo() {
  void load().catch(() => undefined);
}

/** Albedo's code for "the user closed the window or pressed Reject". */
const REJECTED = -4;

/** Resolves soon after `opened` is closed. */
function whenClosed(opened: Window, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (!opened.closed && !signal.aborted) return;
      clearInterval(timer);
      // An answer sent just before the window closed is given time to land.
      setTimeout(resolve, 400);
    }, 300);
  });
}

/**
 * Runs an Albedo request, which opens its window straight away. Albedo's
 * library waits on that window forever if the browser blocks it or the
 * customer closes it, so both are caught here by watching `window.open`.
 */
async function request<T>(run: () => Promise<T>): Promise<T> {
  const open = window.open;
  let opened: Window | null | undefined;
  window.open = function (...args: Parameters<typeof window.open>) {
    opened = open.apply(window, args);
    return opened;
  };
  let pending: Promise<T>;
  try {
    pending = run();
  } finally {
    window.open = open;
  }
  if (opened === null) {
    throw new WalletError("blocked", "The Albedo window was blocked.");
  }

  const done = new AbortController();
  try {
    return await Promise.race([
      pending,
      ...(opened
        ? [
            whenClosed(opened, done.signal).then(() => {
              throw { code: REJECTED, message: "The window was closed." };
            }),
          ]
        : []),
    ]);
  } catch (error) {
    // Albedo answers { error: { code, message } }; its library, when it
    // fails before asking, rejects with { code, message }.
    type Failure = { code?: number; message?: string };
    const outer = (error ?? {}) as Failure & { error?: Failure | string };
    const { code, message } =
      typeof outer.error === "object" ? outer.error : outer;
    throw new WalletError(
      code === REJECTED ? "rejected" : "failed",
      message || "Albedo did not respond.",
    );
  } finally {
    done.abort();
  }
}

export const albedo: WalletAdapter = {
  id: "albedo",

  async connect() {
    const api = await load();
    const { pubkey } = await request(() => api.publicKey({}));
    if (!pubkey) throw new WalletError("failed", "Albedo sent no account.");
    return pubkey;
  },

  // Albedo has no network of its own: each request names the one to use.
  async getNetworkPassphrase() {
    return stellar.passphrase;
  },

  async signTransaction(xdr, { address }) {
    const api = await load();
    const result = await request(() =>
      api.tx({
        xdr,
        pubkey: address,
        network: stellar.network === "PUBLIC" ? "public" : "testnet",
        // Only sign: the payment is sent by PayVia, like every other wallet's.
        submit: false,
      }),
    );
    if (!result.signed_envelope_xdr) {
      throw new WalletError("rejected", "The payment was not approved.");
    }
    return result.signed_envelope_xdr;
  },
};
