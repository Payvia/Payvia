import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  // One retry: a busy machine can make the first load of a page slow. Retried
  // tests are reported as flaky, not hidden.
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  // The service worker is tested on its own in pwa.spec.ts. Elsewhere it is
  // blocked so every request reaches the server.
  use: { baseURL, trace: "retain-on-failure", serviceWorkers: "block" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  // Set E2E_BASE_URL to test against a server that is already running.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // A production build: closer to what users get, and hydration is fast
        // enough that tests do not race it.
        command: `pnpm build && pnpm start --port ${port}`,
        // No captcha on sign-up unless a run asks for one: the tests must not
        // depend on Cloudflare. captcha.spec.ts runs when a key is given.
        env: {
          NEXT_PUBLIC_TURNSTILE_SITE_KEY:
            process.env.E2E_TURNSTILE_SITE_KEY ?? "",
        },
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
