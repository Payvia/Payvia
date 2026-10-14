import { expect, test } from "@playwright/test";
import { TransactionBuilder } from "@stellar/stellar-sdk";
import {
  DEMO,
  loginDemo,
  openAccountMenu,
  ready,
  signupMerchant,
  stubFreighter,
  WALLET,
} from "./helpers";

test.describe("authentication", () => {
  test("merchant pages redirect to login when signed out", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/payments/PV-2026-00124");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login validates, rejects a wrong password, then signs in", async ({
    page,
  }) => {
    await page.goto("/login");
    await ready(page, "Log in");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();

    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByText("Email or password is incorrect."),
    ).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill(DEMO.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Signed-in visitors are sent away from the login page.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("sign up needs the terms accepted", async ({ page }) => {
    await page.goto("/signup");
    await ready(page, "Create account");
    await page.getByLabel("Name").fill("Test Merchant");
    await page.getByLabel("Email").fill(`terms-${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByText("Accept the terms to create an account."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("log out returns to login and locks the app", async ({ page }) => {
    await loginDemo(page);
    await openAccountMenu(page);
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("dashboard", () => {
  test("shows the totals and recent payments from the designs", async ({
    page,
  }) => {
    await loginDemo(page);
    await expect(page.getByText("$4,250.00").last()).toBeVisible();
    await expect(page.getByText("$2,850 USDC")).toBeVisible();
    await expect(page.getByText("$1,400 USDC")).toBeVisible();
    await expect(page.getByText("175 USDC")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Website Design.*INV-00124/ }),
    ).toBeVisible();
    await expect(page.getByText("Add your receiving wallet")).toBeHidden();
  });

  test("new merchant sees the empty state and wallet prompt, then adds a wallet", async ({
    page,
  }) => {
    await signupMerchant(page, { wallet: null });
    await expect(page.getByText("$0.00").last()).toBeVisible();
    await expect(
      page.getByText("No payments yet", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Add your receiving wallet")).toBeVisible();

    await page.getByRole("link", { name: "Add wallet" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await ready(page, "Add wallet");
    const wallet = page.getByLabel("Recipient wallet");
    await wallet.fill("not-a-wallet");
    await page.getByRole("button", { name: "Add wallet" }).click();
    await expect(
      page.getByText("Enter a valid Stellar wallet address."),
    ).toBeVisible();
    await wallet.fill(WALLET);
    await page.getByRole("button", { name: "Add wallet" }).click();
    await expect(page.getByText("Receiving wallet updated")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("$0.00").last()).toBeVisible();
    await expect(page.getByText("Add your receiving wallet")).toBeHidden();
  });
});

test.describe("payment requests", () => {
  test("create, find, open and cancel a request", async ({ page }) => {
    await signupMerchant(page);
    await page.goto("/payments/new");
    await ready(page, "Generate payment link");

    // Empty submit: errors, and later steps stay locked until an asset is chosen.
    await page.getByRole("button", { name: "Generate payment link" }).click();
    await expect(page.getByText("Enter an amount to continue.")).toBeVisible();
    await expect(page.getByText("Select an asset.")).toBeVisible();
    await expect(
      page.getByText("Select an asset first.").first(),
    ).toBeVisible();

    await page.getByLabel("Amount").fill("150");
    await page.getByRole("combobox", { name: "Asset" }).click();
    await page.getByRole("option", { name: "USDC · USD Coin" }).click();
    await page.getByRole("button", { name: "Generate payment link" }).click();
    await expect(page.getByText("Enter a description.")).toBeVisible();

    await page.getByLabel("Description").fill("Website Design");
    await page.getByLabel("Reference").fill("INV-00124");
    await page.getByLabel("Customer name").fill("John");
    // Prefilled from the wallet given during setup.
    await expect(page.getByLabel("Recipient wallet")).toHaveValue(WALLET);
    await page.getByRole("button", { name: "Generate payment link" }).click();

    await expect(
      page.getByText("Your payment link is ready to share."),
    ).toBeVisible();
    await expect(page.getByText(/\/pay\/[A-Za-z0-9]{7}$/)).toBeVisible();
    await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Share on WhatsApp" }),
    ).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/\?text=.*Test%20Studio.*150\.00%20USDC/,
    );
    await expect(page.getByLabel("Amount")).toHaveAttribute("readonly", "");

    // It is now in the list, and searchable.
    await page.goto("/payments?q=INV-00124");
    const row = page
      .getByRole("link", { name: /Website Design/ })
      .filter({ visible: true });
    await expect(row).toHaveCount(1);
    await row.click();

    await expect(page).toHaveURL(/\/payments\/PV-\d{4}-\d{5}$/);
    await expect(
      page.getByRole("status").filter({ hasText: "Waiting for payment." }),
    ).toBeVisible();
    await expect(page.getByText("150.00 USDC").first()).toBeVisible();

    await page.getByRole("button", { name: "Cancel request" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Cancel payment request?",
    });
    await dialog.getByRole("button", { name: "Keep request" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Cancel request" }).click();
    await dialog.getByRole("button", { name: "Cancel request" }).click();

    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "This payment request was cancelled." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel request" }),
    ).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Create new request" }),
    ).toBeVisible();
  });

  test("rejects a malformed wallet address", async ({ page }) => {
    await signupMerchant(page);
    await page.goto("/payments/new");
    await ready(page, "Generate payment link");
    await page.getByLabel("Amount").fill("10");
    await page.getByRole("combobox", { name: "Asset" }).click();
    await page.getByRole("option", { name: "USDC · USD Coin" }).click();
    await page.getByLabel("Description").fill("Deposit");
    await page.getByLabel("Recipient wallet").fill("GABC");
    await page.getByRole("button", { name: "Generate payment link" }).click();
    await expect(
      page.getByText("Enter a valid Stellar wallet address."),
    ).toBeVisible();
    await expect(
      page.getByText("Your payment link is ready to share."),
    ).toBeHidden();
  });

  test("filters and searches payment history", async ({ page }) => {
    await loginDemo(page);
    await page.goto("/payments");
    const rows = page
      .getByRole("link", { name: /INV-\d{5}/ })
      .filter({ visible: true });
    await expect(rows).toHaveCount(24);

    await page.getByRole("radio", { name: "Cancelled" }).click();
    await expect(page).toHaveURL(/status=CANCELLED/);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("INV-00118");

    await page.getByRole("radio", { name: "All" }).click();
    await page
      .getByRole("searchbox", { name: "Search payments" })
      .last()
      .fill("zzz-no-match");
    await expect(page.getByText("No results")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(rows).toHaveCount(24);
  });

  test("paid request links to the Stellar explorer", async ({ page }) => {
    await loginDemo(page);
    await page.goto("/payments/PV-2026-00124");
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Payment received successfully." }),
    ).toBeVisible();
    await expect(page.getByText("8e2a9f41…d73c0b6a")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /View on Stellar Explorer/ }),
    ).toHaveAttribute(
      "href",
      /stellar\.expert\/explorer\/testnet\/tx\/8e2a9f41[0-9a-f]+d73c0b6a$/,
    );
    await expect(
      page.getByRole("button", { name: "Cancel request" }),
    ).toBeHidden();
  });

  test("unknown request shows the invalid link state", async ({ page }) => {
    await loginDemo(page);
    await page.goto("/payments/PV-0000-99999");
    await expect(
      page.getByText("We couldn't find this payment request"),
    ).toBeVisible();
  });
});

test.describe("settings", () => {
  test("saves the merchant profile", async ({ page }) => {
    await signupMerchant(page);
    await page.goto("/settings");
    const save = page.getByRole("button", { name: "Save changes" });
    await ready(page, "Update wallet");
    await expect(save).toBeDisabled();
    await page.getByLabel("Merchant name").fill("Renamed Studio");
    await save.click();
    await expect(page.getByText("Merchant profile saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Merchant name")).toHaveValue(
      "Renamed Studio",
    );
  });

  test("connect wallet explains when Freighter is missing", async ({
    page,
  }) => {
    await signupMerchant(page, { wallet: null });
    await page.goto("/settings");
    await ready(page, "Add wallet");
    await page.getByRole("button", { name: "Connect wallet" }).click();
    await expect(
      page.getByText("Freighter was not found in this browser."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Install Freighter" }),
    ).toBeVisible();
    // The address can still be typed.
    await expect(page.getByLabel("Recipient wallet")).toBeEditable();
  });

  test("connect wallet fills the address from Freighter", async ({ page }) => {
    await stubFreighter(page, WALLET);

    await signupMerchant(page, { wallet: null });
    await page.goto("/settings");
    await ready(page, "Add wallet");
    await page.getByRole("button", { name: "Connect wallet" }).click();
    await expect(page.getByLabel("Recipient wallet")).toHaveValue(WALLET);
    await page.getByRole("button", { name: "Add wallet" }).click();
    await expect(page.getByText("Receiving wallet updated")).toBeVisible();
  });

  test("a wallet without a USDC trustline gets one added from Freighter", async ({
    page,
  }) => {
    await stubFreighter(page, WALLET);
    // Not the issuer this app is configured with: the backend's must win.
    const BACKEND_ISSUER =
      "GCAN3W2EZ576FBHFHRRG2UDUSODNSVK67673ZP2OXUEM3PDHQDTBHPWM";

    // The mock API accepts any wallet, so the first save is refused here the
    // way the backend refuses a wallet that cannot hold USDC.
    let refused = false;
    await page.route("**/api/mock/merchant", async (route) => {
      const request = route.request();
      const savesWallet =
        request.method() === "PATCH" &&
        (request.postData() ?? "").includes("recipient_wallet");
      if (!savesWallet || refused) return route.fallback();
      refused = true;
      await route.fulfill({
        status: 422,
        json: {
          error: {
            code: "no_trustline",
            message: "No USDC trustline.",
            // The backend names the asset it checked for.
            details: { asset: { code: "USDC", issuer: BACKEND_ISSUER } },
          },
        },
      });
    });

    // Stellar, with the wallet funded but holding only XLM.
    const cors = { "access-control-allow-origin": "*" };
    let submitted = "";
    await page.route(/horizon-testnet\.stellar\.org/, async (route) => {
      const request = route.request();
      const { pathname } = new URL(request.url());
      if (request.method() === "POST" && pathname === "/transactions") {
        submitted = request.postData() ?? "";
        return route.fulfill({
          headers: cors,
          json: { hash: "a".repeat(64), successful: true },
        });
      }
      if (pathname === `/accounts/${WALLET}`) {
        return route.fulfill({
          headers: cors,
          json: {
            id: WALLET,
            account_id: WALLET,
            sequence: "100",
            subentry_count: 0,
            balances: [{ asset_type: "native", balance: "100.0000000" }],
          },
        });
      }
      return route.fulfill({ status: 404, headers: cors, json: {} });
    });

    await signupMerchant(page, { wallet: null });
    await page.goto("/settings");
    await ready(page, "Add wallet");
    await page.getByLabel("Recipient wallet").fill(WALLET);
    await page.getByRole("button", { name: "Add wallet" }).click();
    await expect(
      page.getByText("This wallet cannot hold USDC yet"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add USDC to this wallet" }).click();
    // The trustline went to Stellar, then the wallet was saved again.
    await expect(page.getByText("Receiving wallet updated")).toBeVisible();
    const transaction = TransactionBuilder.fromXDR(
      new URLSearchParams(submitted).get("tx") ?? "",
      "Test SDF Network ; September 2015",
    );
    expect(transaction.operations).toMatchObject([
      { type: "changeTrust", line: { code: "USDC", issuer: BACKEND_ISSUER } },
    ]);
    await expect(
      page.getByText("This wallet cannot hold USDC yet"),
    ).toBeHidden();
  });
});
