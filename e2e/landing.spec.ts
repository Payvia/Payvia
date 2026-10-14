import { expect, test } from "@playwright/test";

const headings = [
  "Create a link. Share it anywhere. Get paid on Stellar.",
  "Made for anyone who gets paid.",
  "A payment is marked paid only after Stellar confirms it.",
  "Create your first payment link.",
];

test.describe("landing page", () => {
  test("presents the product from hero to footer", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Get paid as easily as sending a link.",
      }),
    ).toBeVisible();

    for (const name of headings) {
      const heading = page.getByRole("heading", { name });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
    }
    for (const step of [
      "Create",
      "Share",
      "Customer pays",
      "Payment verified",
    ]) {
      await expect(
        page.getByRole("heading", { name: step, exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByText("Payment links and QR payments on Stellar."),
    ).toBeVisible();
  });

  test("calls to action lead to signup and login", async ({ page }) => {
    await page.goto("/");
    const getStarted = page.getByRole("link", { name: "Get started" });
    expect(await getStarted.count()).toBeGreaterThanOrEqual(3);
    for (const link of await getStarted.all()) {
      await expect(link).toHaveAttribute("href", "/signup");
    }
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Log in" }),
    ).toHaveAttribute("href", "/login");
  });

  test("menu opens, lists the sections, and jumps to one", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("dialog", { name: "Site menu" });
    const toggle = page.getByRole("button", { name: /MENU|CLOSE/ });
    // Retry until the page is interactive, without toggling it shut again.
    await expect(async () => {
      if (!(await menu.isVisible())) await toggle.click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass();

    for (const name of [
      "How it works",
      "Use cases",
      "Verification",
      "Log in",
    ]) {
      await expect(menu.getByRole("link", { name })).toBeVisible();
    }
    await menu.getByRole("link", { name: "Verification" }).click();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(/#verification$/);
    await expect(
      page.getByRole("heading", { name: headings[2] }),
    ).toBeInViewport();

    // Escape closes it too.
    await toggle.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("never scrolls sideways", async ({ page }) => {
    await page.goto("/");
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(800);
    expect(await overflow()).toBeLessThanOrEqual(0);
  });

  test("hero total counts up to the real figure", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("$4,250.00").first()).toBeAttached();
  });
});

test.describe("landing page without motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows every section without animating", async ({ page }) => {
    await page.goto("/");
    for (const name of headings) {
      const heading = page.getByRole("heading", { name });
      // Nothing is waiting on a scroll trigger to become visible...
      await expect
        .poll(() => heading.evaluate((el) => getComputedStyle(el).visibility))
        .toBe("visible");
      // ...and the text has not been split into animated lines.
      expect(await heading.locator("div").count()).toBe(0);
    }
    // Smooth scrolling is off: the wheel moves the page natively.
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(100);
  });
});

test.describe("landing page before JavaScript loads", () => {
  test.use({ javaScriptEnabled: false });

  test("is fully readable", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Get paid as easily as sending a link.",
      }),
    ).toBeVisible();
    for (const name of headings) {
      const heading = page.getByRole("heading", { name });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
    }
    await expect(
      page.getByRole("link", { name: "Get started" }).first(),
    ).toBeVisible();
  });
});
