import { z } from "zod";
import { isValidPublicKey } from "@/lib/stellar/strkey";

const schema = z.object({
  appUrl: z.url(),
  apiUrl: z.url().optional(),
  apiMode: z.enum(["mock", "live"]),
  stellarNetwork: z.enum(["TESTNET", "PUBLIC"]),
  horizonUrl: z.url(),
  usdcIssuer: z
    .string()
    .refine(isValidPublicKey, "must be a valid Stellar public key"),
  explorerUrl: z.url(),
  /** Cloudflare Turnstile site key. Without one, sign-up has no captcha. */
  turnstileSiteKey: z.string().min(1).optional(),
});

// NEXT_PUBLIC_* values are inlined at build time, so each one has to be
// referenced by its full name rather than looked up dynamically.
const parsed = schema.safeParse({
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  apiUrl: process.env.NEXT_PUBLIC_API_URL || undefined,
  apiMode: process.env.NEXT_PUBLIC_PAYVIA_API_MODE,
  stellarNetwork: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL,
  usdcIssuer: process.env.NEXT_PUBLIC_USDC_ISSUER,
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL,
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables. Copy .env.example to .env.local and fill it in.\n${z.prettifyError(parsed.error)}`,
  );
}

if (parsed.data.apiMode === "live" && !parsed.data.apiUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required when NEXT_PUBLIC_PAYVIA_API_MODE=live.",
  );
}

export const env = parsed.data;
