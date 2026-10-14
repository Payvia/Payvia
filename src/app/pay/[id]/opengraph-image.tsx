import { ImageResponse } from "next/og";
import { formatAmount } from "@/lib/format";
import { getPublicPayment } from "./payment";

export const alt = "PayVia payment request";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const brand = "#5500ff";

// The preview shown when a payment link is pasted into WhatsApp, iMessage or
// social apps: who is asking, how much, and what for.
export default async function Image({ params }: PageProps<"/pay/[id]">) {
  const { id } = await params;
  const payment = await getPublicPayment(id);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: brand,
        color: "white",
      }}
    >
      <div style={{ display: "flex", fontSize: 40 }}>PayVia</div>
      {payment ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 36, opacity: 0.85 }}>
            {payment.merchant_name} is requesting
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              marginTop: 8,
              fontSize: 168,
              letterSpacing: -6,
            }}
          >
            {formatAmount(payment.amount)}
            <span style={{ fontSize: 48, marginLeft: 20, letterSpacing: 0 }}>
              {payment.asset}
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 36, opacity: 0.85 }}>
            {payment.description.slice(0, 60)}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 72, letterSpacing: -2 }}>
          Payment links and QR payments on Stellar
        </div>
      )}
      <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>
        Review and pay securely with your Stellar wallet
      </div>
    </div>,
    size,
  );
}
