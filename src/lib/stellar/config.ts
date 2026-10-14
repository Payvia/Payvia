import { env } from "@/lib/env";

const passphrases = {
  TESTNET: "Test SDF Network ; September 2015",
  PUBLIC: "Public Global Stellar Network ; September 2015",
} as const;

const labels = { TESTNET: "Stellar Testnet", PUBLIC: "Stellar" } as const;

export const stellar = {
  network: env.stellarNetwork,
  networkLabel: labels[env.stellarNetwork],
  passphrase: passphrases[env.stellarNetwork],
  horizonUrl: env.horizonUrl,
  usdc: { code: "USDC", issuer: env.usdcIssuer },
} as const;

/** Base network fee per operation, in stroops. Horizon may quote higher. */
export const BASE_FEE_STROOPS = 100;

/** How long a signed transaction stays valid. Short, so an abandoned approval
 * cannot be submitted later, after the request has expired or been cancelled. */
export const TX_TIMEOUT_SECONDS = 180;
