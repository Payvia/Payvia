import { env } from "@/lib/env";

const mock = env.apiMode === "mock";

/** What the API the app is running against can do. */
export const features = {
  /** Merchant logos. The live backend does not store them yet. */
  logo: mock,
  /** Requests that never expire. The live backend always sets an expiry. */
  noExpiry: mock,
  /** The merchant is read on the server. Live, the browser owns the session. */
  serverSession: mock,
  /**
   * What only the live backend has: email verification, password reset,
   * password-protected wallet changes, account security, emailing a link,
   * CSV export and refunds.
   */
  backend: !mock,
} as const;
