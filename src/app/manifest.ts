import type { MetadataRoute } from "next";
import { routes } from "@/lib/routes";
import { site } from "@/lib/site";

const shortcutIcons = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
];

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: site.name,
    short_name: site.name,
    description: site.description,
    lang: "en",
    dir: "ltr",
    // The installed app is the merchant app. Signed-out merchants are sent
    // on to the login page.
    start_url: routes.dashboard,
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    // A payment link opened from another app reuses the installed window.
    launch_handler: { client_mode: "navigate-existing" },
    background_color: site.themeColor,
    theme_color: site.themeColor,
    categories: ["finance", "business", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Create payment request",
        short_name: "Create",
        url: routes.newPayment,
        icons: shortcutIcons,
      },
      {
        name: "Payments",
        url: routes.payments,
        icons: shortcutIcons,
      },
      {
        name: "QR codes",
        url: routes.qrCodes,
        icons: shortcutIcons,
      },
    ],
  };
}
