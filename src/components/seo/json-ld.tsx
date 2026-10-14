import { env } from "@/lib/env";
import { site } from "@/lib/site";

const origin = new URL(env.appUrl).origin;

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${origin}/#organization`,
      name: site.name,
      url: origin,
      logo: `${origin}/icons/icon-512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: site.name,
      url: origin,
      description: site.description,
      inLanguage: "en",
      publisher: { "@id": `${origin}/#organization` },
    },
    {
      "@type": "WebApplication",
      "@id": `${origin}/#app`,
      name: site.name,
      url: origin,
      description: site.description,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      featureList: [
        "Payment links",
        "QR code payments",
        "USDC payments on Stellar",
        "On-chain payment verification",
      ],
      publisher: { "@id": `${origin}/#organization` },
    },
  ],
};

/** Structured data describing PayVia, for the landing page. */
export function SiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}
