import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // lib/env.ts validates these on import.
    env: {
      NEXT_PUBLIC_APP_URL: "https://payvia.app",
      NEXT_PUBLIC_PAYVIA_API_MODE: "mock",
      NEXT_PUBLIC_STELLAR_NETWORK: "TESTNET",
      NEXT_PUBLIC_HORIZON_URL: "https://horizon-testnet.stellar.org",
      NEXT_PUBLIC_EXPLORER_URL: "https://stellar.expert/explorer/testnet",
      NEXT_PUBLIC_USDC_ISSUER:
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    },
  },
});
