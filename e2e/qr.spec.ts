import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { loginDemo, ready, signupMerchant } from "./helpers";

/** Reads the text encoded in a QR code PNG. */
function decodeQr(png: Buffer) {
  const { data, width, height } = PNG.sync.read(png);
  return {
    width,
    text: jsQR(new Uint8ClampedArray(data), width, height)?.data ?? null,
  };
}

test.describe("QR codes", () => {
  test("lists requests that are waiting for payment", async ({ page }) => {
    await loginDemo(page);
    await page.goto("/qr");
    const rows = page.getByRole("link", { name: /INV-\d{5}/ });
    await expect(rows).toHaveCount(5);
    // Paid and cancelled requests are left out.
    await expect(page.getByRole("link", { name: /INV-00124/ })).toHaveCount(0);

    await page.getByRole("link", { name: /Consultation.*INV-00123/ }).click();
    await expect(page).toHaveURL(/\/qr\/PV-2026-00123$/);
    await expect(page.getByText("Scan to Pay")).toBeVisible();
    await expect(page.getByText("50.00 USDC")).toBeVisible();
  });

  test("new merchant sees the empty state", async ({ page }) => {
    await signupMerchant(page);
    await page.goto("/qr");
    await expect(page.getByText("No QR codes yet")).toBeVisible();
    await expect(
      page.getByText("Create a payment request to generate a QR code."),
    ).toBeVisible();
  });

  test("downloaded QR code opens the PayVia payment page, not a wallet", async ({
    page,
  }) => {
    await signupMerchant(page);
    await page.goto("/payments/new");
    await ready(page, "Generate payment link");
    await page.getByLabel("Amount").fill("100");
    await page.getByRole("combobox", { name: "Asset" }).click();
    await page.getByRole("option", { name: "USDC · USD Coin" }).click();
    await page.getByLabel("Description").fill("Market stall");
    await page.getByLabel("Reference").fill("Order #12 / A");
    await page.getByRole("button", { name: "Generate payment link" }).click();
    const linkText = await page.getByText(/\/pay\/[A-Za-z0-9]{7}$/).innerText();
    const slug = linkText.split("/pay/")[1];

    await page.getByRole("link", { name: "View QR" }).click();
    await expect(page).toHaveURL(/\/qr\/PV-\d{4}-\d{5}$/);

    const view = page
      .getByRole("link", { name: "View", exact: true })
      .filter({ visible: true });
    await expect(view).toHaveAttribute("href", new RegExp(`/pay/${slug}$`));

    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download" })
      .filter({ visible: true })
      .click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("payvia-Order-12-A.png");

    const { width, text } = decodeQr(await readFile(await download.path()));
    // At least print resolution; high-density screens produce a larger file.
    expect(width).toBeGreaterThanOrEqual(1024);
    expect(text).toMatch(new RegExp(`^https?://.+/pay/${slug}$`));
  });

  test("print opens the print dialog once, with the print card", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __prints: number };
      w.__prints = 0;
      window.print = () => {
        w.__prints += 1;
      };
    });
    const prints = () =>
      page.evaluate(() => (window as unknown as { __prints: number }).__prints);

    await loginDemo(page);
    await page.goto("/qr/PV-2026-00123");
    await page
      .getByRole("link", { name: "Print" })
      .filter({ visible: true })
      .click();

    await expect(page).toHaveURL(/\/qr\/PV-2026-00123\/print$/);
    await expect(page.getByText("ABC Digital").last()).toBeVisible();
    await expect(page.getByText(/\/pay\/demo00123$/)).toBeVisible();
    await expect(
      page.getByText("Scan the QR code to open this payment request."),
    ).toBeVisible();
    await expect.poll(prints).toBe(1);

    // A reload must not print again.
    await page.reload();
    await expect(page.getByText("Scan to Pay")).toBeVisible();
    await page.waitForTimeout(500);
    expect(await prints()).toBe(0);

    await page.getByRole("button", { name: "Print" }).click();
    expect(await prints()).toBe(1);

    // The app shell is hidden on paper.
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("button", { name: "Print" })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Account menu" }),
    ).toBeHidden();
    await expect(page.getByText("Scan to Pay")).toBeVisible();
  });

  test("warns when the request can no longer be paid", async ({ page }) => {
    await loginDemo(page);
    await page.goto("/qr/PV-2026-00118");
    await expect(
      page.getByText("This request is no longer active."),
    ).toBeVisible();
    await page.goto("/qr/PV-0000-99999");
    await expect(
      page.getByText("We couldn't find this payment request"),
    ).toBeVisible();
  });
});

test.describe("payment link preview", () => {
  test("describes the request and serves a preview image", async ({
    page,
    request,
  }) => {
    await page.goto("/pay/8Xk92Lm");
    await expect(page).toHaveTitle("Pay 150.00 USDC to ABC Digital · PayVia");
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute(
      "content",
      /ABC Digital is requesting 150\.00 USDC for Website Design/,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );

    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(image).toBeTruthy();
    const response = await request.get(
      new URL(image!).pathname + new URL(image!).search,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });

  test("unknown links get a neutral title", async ({ page }) => {
    await page.goto("/pay/does-not-exist");
    await expect(page).toHaveTitle("Payment request not found · PayVia");
  });
});
