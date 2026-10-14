import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { env } from "@/lib/env";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-payvia-sans",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-payvia-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  category: "finance",
  // Stops phones turning amounts and wallet addresses into call links.
  formatDetection: { telephone: false, address: false, email: false },
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: "default",
  },
  // Pages that should be indexed add a canonical URL and social cards with
  // pageMetadata(); private ones opt out with noIndex.
  openGraph: { siteName: site.name, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: site.themeColor,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
