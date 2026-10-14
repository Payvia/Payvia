import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The merchant app sits behind a login. /pay/ is deliberately not
      // listed: those pages carry a noindex tag, which crawlers only see if
      // they may fetch the page, and link-preview bots need the page too.
      disallow: [
        "/api/",
        "/dashboard",
        "/payments",
        "/qr",
        "/settings",
        "/setup",
        "/dev/",
        "/offline",
      ],
    },
    sitemap: new URL("/sitemap.xml", env.appUrl).href,
    host: new URL(env.appUrl).origin,
  };
}
