import { expect, test, type Page } from "@playwright/test";

// The sign-up captcha (Cloudflare Turnstile). The other tests run without it;
// these run when the build is given a site key, and need to reach Cloudflare:
//
//   E2E_TURNSTILE_SITE_KEY=1x00000000000000000000AA pnpm test:e2e captcha
//
// That is Cloudflare's test key, which always passes.
test.skip(
  !process.env.E2E_TURNSTILE_SITE_KEY,
  "Set E2E_TURNSTILE_SITE_KEY to test the captcha.",
);

async function fillSignup(page: Page) {
  await page.goto("/signup");
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toHaveAttribute("data-ready", "true");
  const email = `captcha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.getByLabel("Name").fill("Test Merchant");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel(/I agree to PayVia's Terms/).check();
  return email;
}

test("sign-up waits for the captcha, then sends its token", async ({
  page,
}) => {
  const create = page.getByRole("button", { name: "Create account" });
  await fillSignup(page);

  const signup = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().includes("/auth/signup"),
  );
  // Enabled only once Turnstile has handed over a token.
  await expect(create).toBeEnabled({ timeout: 30_000 });
  await create.click();
  expect((await signup).postDataJSON().captcha_token).toMatch(/.{10,}/);
  await expect(page).toHaveURL(/\/setup$/);
});

test("a failed sign-up gets a fresh token for the retry", async ({ page }) => {
  const create = page.getByRole("button", { name: "Create account" });
  const tokens: string[] = [];
  let refused = false;
  await page.route("**/api/mock/auth/signup", async (route) => {
    tokens.push(route.request().postDataJSON().captcha_token);
    if (refused) return route.fallback();
    refused = true;
    await route.fulfill({
      status: 422,
      json: { error: { code: "captcha_failed", message: "Try again." } },
    });
  });

  await fillSignup(page);
  await expect(create).toBeEnabled({ timeout: 30_000 });
  // Count how often the widget is asked to run again. (The test key hands
  // out the same token every time, so the tokens cannot be compared.)
  await page.evaluate(() => {
    const turnstile = window.turnstile!;
    const reset = turnstile.reset.bind(turnstile);
    Object.assign(window, { captchaResets: 0 });
    turnstile.reset = (id) => {
      (window as unknown as { captchaResets: number }).captchaResets += 1;
      reset(id);
    };
  });
  await create.click();
  await expect(page.getByText("Try again.")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { captchaResets: number }).captchaResets,
    ),
  ).toBe(1);

  // The used token is gone; the button waits for the next one.
  await expect(create).toBeEnabled({ timeout: 30_000 });
  await create.click();
  await expect(page).toHaveURL(/\/setup$/);
  expect(tokens).toHaveLength(2);
});

test("says so when the captcha cannot load", async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.abort(),
  );
  await fillSignup(page);
  await expect(page.getByText("The security check did not load")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeDisabled();
});
