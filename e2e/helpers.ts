import { expect, type Page } from "@playwright/test";

export const DEMO = { email: "hello@abcdigital.com", password: "password123" };

/** A well-formed Stellar address (valid checksum, not a funded account). */
export const WALLET =
  "GDXESB5EPKANKLLZ66KURBVLXP3J3SSGNWFOGIN7VW2BC2MGWKSI4D7P";

/**
 * Submit buttons are disabled until the page is interactive. Wait for that
 * before typing, or the input can be lost when React takes over.
 */
export async function ready(page: Page, submitName: string | RegExp) {
  await expect(
    page.getByRole("button", { name: submitName, disabled: undefined }),
  ).toHaveAttribute("data-ready", "true");
}

/** Opens the account menu, retrying until the top bar is interactive. */
export async function openAccountMenu(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 1000 });
  }).toPass();
}

export async function loginDemo(page: Page) {
  await page.goto("/login");
  await ready(page, "Log in");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password", { exact: true }).fill(DEMO.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Signs up a fresh merchant so tests that change data do not affect each
 * other or the demo account. Ends on the dashboard.
 */
export async function signupMerchant(
  page: Page,
  { wallet = WALLET as string | null, business = "Test Studio" } = {},
) {
  const email = `merchant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  await ready(page, "Create account");
  await page.getByLabel("Name").fill("Test Merchant");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel(/I agree to PayVia's Terms/).check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/setup$/);
  await ready(page, "Continue");
  await page.getByLabel("Merchant name").fill(business);
  if (wallet) await page.getByLabel("Default receiving wallet").fill(wallet);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return { email };
}

/**
 * Stands in for the Freighter extension: answers the page's requests the way
 * its content script does, as the account `publicKey` on Testnet. It "signs"
 * by handing the transaction back unchanged.
 */
export async function stubFreighter(page: Page, publicKey: string) {
  await page.addInitScript((publicKey) => {
    Object.assign(window, { freighter: true });
    window.addEventListener("message", (event) => {
      if (event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") return;
      window.postMessage(
        {
          source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
          messagedId: event.data.messageId,
          publicKey,
          networkDetails: {
            network: "TESTNET",
            networkPassphrase: "Test SDF Network ; September 2015",
          },
          signedTransaction: event.data.transactionXdr,
          signerAddress: publicKey,
        },
        window.location.origin,
      );
    });
  }, publicKey);
}
