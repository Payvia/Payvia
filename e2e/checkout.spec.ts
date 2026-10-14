import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { WALLET } from "./helpers";

/**
 * Creates a merchant and a payment request through the API, so each test has
 * its own request. Returns what the tests need to follow it up.
 */
async function createRequest(
  request: APIRequestContext,
  {
    amount = "100",
    expiry = "NONE",
  }: { amount?: string; expiry?: "NONE" | "24H" } = {},
) {
  const email = `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await request.post("/api/mock/auth/signup", {
    data: { name: "Test Merchant", email, password: "password123" },
  });
  await request.patch("/api/mock/merchant", {
    data: { business_name: "Corner Cafe", recipient_wallet: WALLET },
  });
  const created = await request.post("/api/mock/payments", {
    data: {
      amount,
      asset: "USDC",
      description: "Lunch order",
      reference: "ORD-77",
      expiry,
      recipient_wallet: WALLET,
    },
  });
  const payment = (await created.json()) as {
    slug: string;
    payment_id: string;
  };
  const merchantView = async () =>
    (await (
      await request.get(`/api/mock/payments/${payment.payment_id}`)
    ).json()) as {
      status: string;
      transaction_hash?: string;
      customer_wallet?: string;
    };
  return { ...payment, merchantView };
}

const connectButton = (page: Page) =>
  page.getByRole("button", { name: "Connect Stellar Wallet" });

/** Opens the wallet sheet, retrying until the page is interactive. */
async function openWallets(page: Page) {
  const sheet = page.getByRole("dialog", { name: "Connect a wallet" });
  await expect(async () => {
    await connectButton(page).click();
    await expect(sheet).toBeVisible({ timeout: 1000 });
  }).toPass();
  return sheet;
}

async function connectDemoWallet(page: Page) {
  const sheet = await openWallets(page);
  await sheet.getByRole("button", { name: /Demo wallet/ }).click();
  await expect(
    page.getByRole("button", { name: "Review payment" }),
  ).toBeVisible();
}

async function reachReview(page: Page) {
  await connectDemoWallet(page);
  await page.getByRole("button", { name: "Review payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Review Payment" }),
  ).toBeVisible();
}

test.describe("customer checkout", () => {
  test("pays a request end to end and the merchant sees it paid", async ({
    page,
    request,
  }) => {
    const { slug, payment_id, merchantView } = await createRequest(request);
    await page.goto(`/pay/${slug}`);

    // What is being paid, before any wallet is involved.
    await expect(page.getByText("Corner Cafe").first()).toBeVisible();
    await expect(page.getByText("$100.00")).toBeVisible();
    await expect(page.getByText("Amount due")).toBeVisible();
    await expect(page.getByText(payment_id)).toBeVisible();
    await expect(page.getByText("ORD-77")).toBeVisible();
    await expect(page.getByText("Stellar Testnet")).toBeVisible();
    await expect(
      page.getByText("You'll review everything before approving"),
    ).toBeVisible();

    await connectDemoWallet(page);
    await expect(page.getByText("GCHS…KMSG")).toBeVisible();

    await page.getByRole("button", { name: "Review payment" }).click();
    await expect(page.getByText("0.00001 XLM")).toBeVisible();
    await expect(page.getByText("100.00 USDC", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Approve payment" }).click();
    await expect(
      page.getByText("Approve the payment in your wallet"),
    ).toBeVisible();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Your payment is being confirmed on Stellar." }),
    ).toBeVisible();
    // Reported to the backend as soon as it is submitted.
    await expect
      .poll(async () => (await merchantView()).status)
      .not.toBe("PENDING");

    // The mock backend confirms after a few seconds.
    await expect(page.getByText("Paid", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Transaction ID")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download receipt" }),
    ).toBeVisible();
    await expect(connectButton(page)).toBeHidden();

    const paid = await merchantView();
    expect(paid.status).toBe("PAID");
    expect(paid.transaction_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(paid.customer_wallet).toMatch(/^GCHS/);

    // Opening the link again shows it is settled, with no way to pay twice.
    await page.reload();
    await expect(
      page.getByText("This payment request has already been paid."),
    ).toBeVisible();
    await expect(connectButton(page)).toBeHidden();
  });

  test("double-clicking approve sends one payment", async ({
    page,
    request,
  }) => {
    const { slug } = await createRequest(request);
    let submissions = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().endsWith("/submitted"))
        submissions += 1;
    });
    await page.goto(`/pay/${slug}`);
    await reachReview(page);
    await page.getByRole("button", { name: "Approve payment" }).dblclick();
    await expect(page.getByText("Paid", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    expect(submissions).toBe(1);
  });

  test("disconnecting returns to the start", async ({ page, request }) => {
    const { slug } = await createRequest(request);
    await page.goto(`/pay/${slug}`);
    await connectDemoWallet(page);
    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(connectButton(page)).toBeVisible();
    await expect(page.getByText("GCHS…KMSG")).toBeHidden();
  });

  test("cancelling in the signing step sends nothing", async ({
    page,
    request,
  }) => {
    const { slug, merchantView } = await createRequest(request);
    await page.goto(`/pay/${slug}?demo=slow-sign`);
    await reachReview(page);
    await page.getByRole("button", { name: "Approve payment" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", { name: "Review Payment" }),
    ).toBeVisible();
    // Wait for the abandoned signature to come back; it must be ignored.
    await page.waitForTimeout(9000);
    await expect(
      page.getByRole("button", { name: "Approve payment" }),
    ).toBeEnabled();
    expect((await merchantView()).status).toBe("PENDING");
  });

  test("scan QR sheet shows the code and link", async ({ page, request }) => {
    const { slug } = await createRequest(request);
    await page.goto(`/pay/${slug}`);
    const sheet = page.getByRole("dialog", { name: "Scan QR Code" });
    await expect(async () => {
      await page.getByRole("button", { name: "Scan QR Code" }).click();
      await expect(sheet).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(sheet.getByRole("img", { name: /QR code/ })).toBeVisible();
    await expect(sheet.getByText(new RegExp(`/pay/${slug}$`))).toBeVisible();
  });
});

test.describe("wallet problems", () => {
  test("Freighter missing: says so and offers to install it", async ({
    page,
    request,
  }) => {
    // The test browser has no Freighter extension, so this is the real adapter.
    const { slug } = await createRequest(request);
    await page.goto(`/pay/${slug}`);
    const sheet = await openWallets(page);
    await sheet.getByRole("button", { name: /Freighter/ }).click();
    await expect(sheet.getByText("Not installed")).toBeVisible();
    await expect(
      sheet.getByRole("link", { name: "Install Freighter" }),
    ).toHaveAttribute("href", "https://www.freighter.app/");
    // Nothing was connected: closing the sheet returns to the start.
    await page.keyboard.press("Escape");
    await expect(connectButton(page)).toBeVisible();
  });

  test("connection rejected: stays on the sheet to retry", async ({
    page,
    request,
  }) => {
    const { slug } = await createRequest(request);
    await page.goto(`/pay/${slug}?demo=reject-connect`);
    const sheet = await openWallets(page);
    await sheet.getByRole("button", { name: /Demo wallet/ }).click();
    await expect(sheet.getByText("Connection rejected")).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: /Demo wallet/ }),
    ).toBeEnabled();
  });

  for (const [scenario, title] of [
    ["insufficient", "Insufficient balance"],
    ["no-trustline", "Your wallet can't hold USDC yet"],
    ["wrong-network", "Wrong network"],
  ] as const) {
    test(`${scenario}: explains and blocks approval`, async ({
      page,
      request,
    }) => {
      const { slug, merchantView } = await createRequest(request);
      await page.goto(`/pay/${slug}?demo=${scenario}`);
      await reachReview(page);
      await expect(
        page.getByRole("alert").filter({ hasText: title }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Approve payment" }),
      ).toBeDisabled();
      expect((await merchantView()).status).toBe("PENDING");
    });
  }

  test("rejected in wallet: shows the reason and lets the customer retry", async ({
    page,
    request,
  }) => {
    const { slug, merchantView } = await createRequest(request);
    await page.goto(`/pay/${slug}?demo=reject-sign`);
    await reachReview(page);
    await page.getByRole("button", { name: "Approve payment" }).click();

    await expect(page.getByText("Payment Failed")).toBeVisible();
    await expect(
      page.getByText("Payment could not be completed"),
    ).toBeVisible();
    await expect(
      page.getByText(/was not approved on time on your wallet/),
    ).toBeVisible();
    expect((await merchantView()).status).toBe("PENDING");

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(
      page.getByRole("heading", { name: "Review Payment" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve payment" }),
    ).toBeEnabled();
  });

  test("Stellar rejects the payment: shows a plain reason", async ({
    page,
    request,
  }) => {
    const { slug } = await createRequest(request);
    await page.goto(`/pay/${slug}?demo=submit-fail`);
    await reachReview(page);
    await page.getByRole("button", { name: "Approve payment" }).click();
    await expect(
      page.getByText("Your wallet does not have enough USDC."),
    ).toBeVisible();
    await expect(page.getByText(/op_|tx_/)).toHaveCount(0);
  });

  test("Stellar times out: keeps checking instead of failing", async ({
    page,
    request,
  }) => {
    const { slug } = await createRequest(request);
    await page.goto(`/pay/${slug}?demo=submit-timeout`);
    await reachReview(page);
    await page.getByRole("button", { name: "Approve payment" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "being confirmed on Stellar" }),
    ).toBeVisible();
    await expect(page.getByText("Payment Failed")).toBeHidden();
    await expect(page.getByText("Paid", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("links that cannot be paid", () => {
  test("expired", async ({ page }) => {
    await page.goto("/pay/demo00119");
    await expect(page.getByText("Link Expired")).toBeVisible();
    await expect(
      page.getByText("This payment request is no longer active at this time."),
    ).toBeVisible();
    await expect(
      page.getByText("Contact ABC Digital to request a new payment link."),
    ).toBeVisible();
    await expect(connectButton(page)).toBeHidden();
  });

  test("cancelled", async ({ page }) => {
    await page.goto("/pay/demo00118");
    await expect(
      page.getByText("This payment request was cancelled."),
    ).toBeVisible();
    await expect(connectButton(page)).toBeHidden();
  });

  test("already paid", async ({ page }) => {
    await page.goto("/pay/8Xk92Lm");
    await expect(page.getByText("Already paid")).toBeVisible();
    await expect(page.getByText("8e2a9f41…d73c0b6a")).toBeVisible();
    await expect(connectButton(page)).toBeHidden();
  });

  test("being paid by someone else", async ({ page }) => {
    await page.goto("/pay/demo00121");
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "A payment for this request is being confirmed" }),
    ).toBeVisible();
    await expect(connectButton(page)).toBeHidden();
  });

  test("unknown link", async ({ page }) => {
    await page.goto("/pay/does-not-exist");
    await expect(
      page.getByRole("heading", {
        name: "We couldn't find this payment request",
      }),
    ).toBeVisible();
    await expect(connectButton(page)).toBeHidden();
  });

  test("cancelled by the merchant while the customer is reviewing", async ({
    page,
    request,
  }) => {
    const { slug, payment_id, merchantView } = await createRequest(request);
    await page.goto(`/pay/${slug}`);
    await reachReview(page);

    await request.post(`/api/mock/payments/${payment_id}/cancel`);
    await page.getByRole("button", { name: "Approve payment" }).click();

    await expect(
      page.getByText("This payment request was cancelled."),
    ).toBeVisible();
    expect((await merchantView()).status).toBe("CANCELLED");
  });
});

test("merchant dashboard reflects a payment without a manual refresh", async ({
  page,
  request,
  browser,
}) => {
  const { slug, payment_id } = await createRequest(request, { amount: "42" });

  // Merchant watches the request's details page...
  const merchantContext = await browser.newContext({
    storageState: await request.storageState(),
  });
  const merchantPage = await merchantContext.newPage();
  await merchantPage.goto(`/payments/${payment_id}`);
  await expect(
    merchantPage
      .getByRole("status")
      .filter({ hasText: "Waiting for payment." }),
  ).toBeVisible();

  // ...while the customer pays in another browser.
  await page.context().clearCookies();
  await page.goto(`/pay/${slug}`);
  await reachReview(page);
  await page.getByRole("button", { name: "Approve payment" }).click();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  await expect(
    merchantPage
      .getByRole("status")
      .filter({ hasText: "Payment received successfully." }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(merchantPage.getByText("Transaction hash")).toBeVisible();
  await merchantContext.close();
});

// Albedo signs in a window of its own at albedo.link. These tests serve a
// stand-in for that page, which speaks the same messages to the payment page.
const ALBEDO_ACCOUNT =
  "GCAN3W2EZ576FBHFHRRG2UDUSODNSVK67673ZP2OXUEM3PDHQDTBHPWM";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

/** `approve` answers every request; `close` shuts the window unanswered. */
async function stubAlbedo(context: BrowserContext, mode: "approve" | "close") {
  await context.route("https://albedo.link/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><title>Albedo</title><script>
        if (${JSON.stringify(mode)} === "close") {
          window.close();
        } else {
          window.addEventListener("message", (event) => {
            const request = event.data;
            if (!request || !request.__reqid) return;
            window.opener.postMessage({
              albedoIntentResult: {
                __reqid: request.__reqid,
                intent: request.intent,
                pubkey: ${JSON.stringify(ALBEDO_ACCOUNT)},
                // "Signs" by handing the transaction back unchanged.
                signed_envelope_xdr: request.xdr,
              },
            }, "*");
          });
          window.opener.postMessage({ albedo: { protocol: 3 } }, "*");
        }
      </script>`,
    }),
  );
}

/** Stellar, with both wallets funded and able to hold USDC. */
async function stubHorizon(page: Page) {
  const cors = { "access-control-allow-origin": "*" };
  const submitted: string[] = [];
  await page.route(/horizon-testnet\.stellar\.org/, (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (request.method() === "POST" && pathname === "/transactions") {
      submitted.push(request.postData() ?? "");
      return route.fulfill({
        headers: cors,
        json: { hash: "b".repeat(64), successful: true },
      });
    }
    const account = pathname.match(/^\/accounts\/(G[A-Z2-7]{55})$/)?.[1];
    if (!account)
      return route.fulfill({ status: 404, headers: cors, json: {} });
    return route.fulfill({
      headers: cors,
      json: {
        id: account,
        account_id: account,
        sequence: "100",
        subentry_count: 1,
        balances: [
          {
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: USDC_ISSUER,
            balance: "500.0000000",
            selling_liabilities: "0.0000000",
          },
          {
            asset_type: "native",
            balance: "100.0000000",
            selling_liabilities: "0.0000000",
          },
        ],
      },
    });
  });
  return submitted;
}

test.describe("Albedo", () => {
  test("pays a request through the Albedo window", async ({
    page,
    context,
    request,
  }) => {
    await stubAlbedo(context, "approve");
    const submitted = await stubHorizon(page);
    const { slug, merchantView } = await createRequest(request);
    await page.goto(`/pay/${slug}`);

    const sheet = await openWallets(page);
    await sheet.getByRole("button", { name: /Albedo/ }).click();
    await expect(page.getByText("GCAN…HPWM")).toBeVisible();

    await page.getByRole("button", { name: "Review payment" }).click();
    await expect(page.getByText("100.00 USDC", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Approve payment" }).click();

    await expect(page.getByText("Paid", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    expect(submitted).toHaveLength(1);
    const paid = await merchantView();
    expect(paid.status).toBe("PAID");
    expect(paid.customer_wallet).toBe(ALBEDO_ACCOUNT);
  });

  test("closing the Albedo window returns to the wallet list", async ({
    page,
    context,
    request,
  }) => {
    await stubAlbedo(context, "close");
    const { slug } = await createRequest(request);
    await page.goto(`/pay/${slug}`);

    const sheet = await openWallets(page);
    await sheet.getByRole("button", { name: /Albedo/ }).click();
    await expect(sheet.getByText("Connection rejected")).toBeVisible();
    await expect(sheet.getByRole("button", { name: /Albedo/ })).toBeEnabled();
  });

  test("a blocked pop-up is explained", async ({ page, request }) => {
    await page.addInitScript(() => {
      window.open = () => null;
    });
    const { slug } = await createRequest(request);
    await page.goto(`/pay/${slug}`);

    const sheet = await openWallets(page);
    await sheet.getByRole("button", { name: /Albedo/ }).click();
    await expect(sheet.getByText("Pop-up blocked")).toBeVisible();
    await expect(sheet.getByRole("button", { name: /Albedo/ })).toBeEnabled();
  });
});
