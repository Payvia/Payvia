import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

const url = (path: string) => new URL(path, env.appUrl).href;

// Only the pages meant to be found in search. The merchant app and payment
// pages are private.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: url(routes.home), changeFrequency: "weekly", priority: 1 },
    { url: url(routes.signup), changeFrequency: "monthly", priority: 0.6 },
    { url: url(routes.login), changeFrequency: "monthly", priority: 0.3 },
  ];
}
