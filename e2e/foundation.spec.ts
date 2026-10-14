import { expect, test } from "@playwright/test";

test.describe("foundation", () => {
  test("unknown routes show the not-found page", async ({ page }) => {
    const response = await page.goto("/definitely-not-here");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  });
});

test.describe("design system page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/components");
  });

  test("split heading reveals and stays readable", async ({ page }) => {
    const heading = page.getByRole("heading", { name: "PayVia components" });
    await expect(heading).toBeVisible();
    // Lines finish at their natural position once the reveal has played.
    await expect
      .poll(async () =>
        heading.evaluate((el) => {
          const line = el.querySelector<HTMLElement>("div div") ?? el;
          return Math.round(
            new DOMMatrix(getComputedStyle(line).transform).m42,
          );
        }),
      )
      .toBe(0);
  });

  test("count-up settles on the exact amount", async ({ page }) => {
    await expect(page.getByText("$4,250.00").last()).toBeVisible();
  });

  test("field errors are announced and clear when fixed", async ({ page }) => {
    const amount = page.getByLabel("Amount");
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByRole("alert").filter({ hasText: "Enter an amount" }),
    ).toBeVisible();
    await amount.fill("150");
    await expect(amount).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter an amount to continue.")).toBeHidden();
  });

  test("segmented control and select respond to input", async ({ page }) => {
    await page.getByRole("radio", { name: /24 hours/ }).click();
    await expect(page.getByRole("radio", { name: /24 hours/ })).toBeChecked();

    await page.getByRole("combobox", { name: "Choose asset" }).click();
    await page.getByRole("option", { name: "USDC · USD Coin" }).click();
    await expect(
      page.getByRole("combobox", { name: "Choose asset" }),
    ).toHaveText(/USDC · USD Coin/);
  });

  test("dialog traps focus and closes on Escape", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open dialog" });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: "Cancel payment request?",
    });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("sheet opens and closes", async ({ page }) => {
    await page.getByRole("button", { name: "Open sheet" }).click();
    const sheet = page.getByRole("dialog", { name: "Connect a wallet" });
    await expect(
      sheet.getByRole("button", { name: "Freighter" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("copy button confirms", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy wallet address" }).click();
    await expect(
      page.getByRole("button", { name: "Copied wallet address" }),
    ).toBeVisible();
    await expect(page.getByText("Copied wallet address").last()).toBeVisible();
  });
});

test.describe("mock API", () => {
  test("login, read the dashboard summary, log out", async ({ request }) => {
    expect((await request.get("/api/mock/me")).status()).toBe(401);

    const login = await request.post("/api/mock/auth/login", {
      data: { email: "hello@abcdigital.com", password: "password123" },
    });
    expect(login.ok()).toBe(true);

    const summary = await request.get("/api/mock/payments/summary");
    expect(await summary.json()).toMatchObject({
      total_requested: "4250",
      paid: "2850",
      pending: "1400",
      payment_links: 24,
    });

    await request.post("/api/mock/auth/logout");
    expect((await request.get("/api/mock/me")).status()).toBe(401);
  });
});
