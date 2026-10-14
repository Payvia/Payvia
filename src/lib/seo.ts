import type { Metadata } from "next";
import { site } from "@/lib/site";

// A page that sets `openGraph` replaces the root layout's, share image
// included, so app/opengraph-image.tsx is named again here.
const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: site.title,
};

/**
 * Metadata for a page search engines may index: canonical URL plus matching
 * Open Graph and Twitter cards. Without a title the page takes the site title.
 */
export function pageMetadata({
  title,
  description = site.description,
  path,
}: {
  title?: string;
  description?: string;
  path: string;
}): Metadata {
  const social = { title: title ?? site.title, description };
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      ...social,
      url: path,
      siteName: site.name,
      type: "website",
      locale: "en_US",
      images: [shareImage],
    },
    twitter: { card: "summary_large_image", ...social, images: [shareImage] },
  };
}

/** For pages that sit behind a login or only make sense to one visitor. */
export const noIndex: Metadata["robots"] = { index: false, follow: false };
