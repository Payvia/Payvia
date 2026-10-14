import { expect, test } from "@playwright/test";

test.describe("web app manifest", () => {
  test("describes an installable app with icons that load", async ({
    request,
  }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    const manifest = await response.json();

    expect(manifest).toMatchObject({
      name: "PayVia",
      start_url: "/dashboard",
      display: "standalone",
    });
    expect(
      manifest.icons.some(
        (icon: { purpose?: string }) => icon.purpose === "maskable",
      ),
    ).toBe(true);
    expect(manifest.shortcuts).toHaveLength(3);

    for (const icon of manifest.icons) {
      const image = await request.get(icon.src);
      expect(image.ok(), icon.src).toBe(true);
      expect(image.headers()["content-type"]).toBe(icon.type);
    }
  });

  test("is linked from the page with icons and a theme colour", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /manifest\.webmanifest/,
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#ffffff",
    );
  });
});

test.describe("service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("is served uncached", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("javascript");
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("shows the offline page when a page cannot be loaded", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    // Active, in control of the page, and done storing the offline page.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener("controllerchange", resolve),
        );
      }
    });
    expect(await page.evaluate(() => caches.match("/offline"))).toBeTruthy();

    await context.setOffline(true);
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "You're offline" }),
    ).toBeVisible();
    // Styled from the cache, not a bare document.
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCSS(
      "background-color",
      "rgb(17, 17, 17)",
    );

    // Coming back online retries the page that failed.
    await context.setOffline(false);
    await expect(page.getByRole("heading", { name: /Log in/ })).toBeVisible();
  });

  test("never caches pages or API responses", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.goto("/login");
    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          urls.push(new URL(request.url).pathname);
        }
      }
      return urls;
    });
    const unexpected = cached.filter(
      (path) =>
        path !== "/offline" &&
        !path.startsWith("/_next/") &&
        !/^\/(images|illustrations|icons)\//.test(path),
    );
    expect(unexpected).toEqual([]);
  });
});
