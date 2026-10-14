import { expect, test } from "@playwright/test";

test.describe("crawler files", () => {
  test("robots.txt allows the site, hides the app, and names the sitemap", async ({
    request,
  }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Allow: \/\n/);
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Disallow: /api/");
    // Payment pages stay fetchable so link previews and noindex both work.
    expect(robots).not.toMatch(/Disallow: \/pay\/?\n/);
    expect(robots).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test("sitemap.xml lists only public pages", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.headers()["content-type"]).toContain("xml");
    const locations = [
      ...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g),
    ].map((match) => new URL(match[1]).pathname);
    expect(locations.sort()).toEqual(["/", "/login", "/signup"]);
  });
});

test.describe("page metadata", () => {
  test("the landing page has a canonical URL, social cards and structured data", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PayVia — Payment links and QR payments/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/?$/,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /payment request/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /PayVia/,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    await expect(page.locator("h1")).toHaveCount(1);

    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    const response = await page.request.get(new URL(image!).pathname);
    expect(response.headers()["content-type"]).toBe("image/png");

    const data = JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .textContent()) ?? "",
    );
    expect(
      data["@graph"].map((node: { "@type": string }) => node["@type"]),
    ).toEqual(["Organization", "WebSite", "WebApplication"]);
  });

  test("sign up is indexable with its own canonical URL", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveTitle("Sign up · PayVia");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/signup$/,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /^index, follow/,
    );
  });

  test("private pages are kept out of search", async ({ page }) => {
    for (const path of ["/offline", "/pay/does-not-exist"]) {
      await page.goto(path);
      await expect(
        page.locator('meta[name="robots"]').first(),
        path,
      ).toHaveAttribute("content", /noindex/);
    }
  });
});
