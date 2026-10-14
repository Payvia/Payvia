import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The preview for every page that does not draw its own, as payment pages do.
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: site.brandColor,
        color: "white",
      }}
    >
      <div style={{ display: "flex", fontSize: 40 }}>{site.name}</div>
      <div
        style={{
          display: "flex",
          fontSize: 96,
          lineHeight: 1.05,
          letterSpacing: -3,
          maxWidth: 940,
        }}
      >
        Payment links and QR payments on Stellar
      </div>
      <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>
        Create a request, share it anywhere, get paid in USDC
      </div>
    </div>,
    size,
  );
}
