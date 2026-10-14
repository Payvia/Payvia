import { Badge } from "@/components/ui/badge";
import type { Payment } from "@/lib/api/schemas";
import { cn } from "@/lib/cn";
import { formatAssetAmount, formatPaymentUrl } from "@/lib/format";
import { QRCode } from "./qr-code";

const networkLabel = { TESTNET: "Stellar Testnet", PUBLIC: "Stellar" } as const;

type ScanCardProps = {
  payment: Payment;
  /** Shown on the print card so the customer knows who they are paying. */
  merchantName?: string;
  /** Print layout: adds merchant, details, link and instructions. */
  variant?: "screen" | "print";
  className?: string;
};

/** "Scan to Pay" card, on screen (QR view) and on paper (print card). */
export function ScanCard({
  payment,
  merchantName,
  variant = "screen",
  className,
}: ScanCardProps) {
  const print = variant === "print";

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-sm rounded-panel border border-line bg-surface p-5 text-center",
        print && "max-w-md p-7",
        className,
      )}
    >
      {print ? (
        <>
          <p className="text-2xl tracking-tight">PayVia</p>
          {merchantName ? <p className="mt-5 text-lg">{merchantName}</p> : null}
        </>
      ) : null}
      <p className={cn("text-xl tracking-tight", print && "mt-1 text-2xl")}>
        Scan to Pay
      </p>
      {print ? (
        payment.network === "TESTNET" ? (
          <Badge tone="danger" className="mt-2 h-5">
            Testnet
          </Badge>
        ) : null
      ) : (
        <>
          <p className="mt-4 text-base">{payment.description}</p>
          <p className="mt-3 text-xs text-muted">
            {payment.reference ?? payment.payment_id}
          </p>
        </>
      )}

      <div className="mt-5 flex justify-center rounded-xl border border-line bg-canvas p-6 print:bg-white">
        <QRCode
          value={payment.payment_url}
          size={print ? 260 : 220}
          className="h-auto w-full max-w-[260px] rounded-none"
        />
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight">
        {formatAssetAmount(payment.amount, payment.asset)}
      </p>

      {print ? (
        <div className="mt-6 text-left">
          <dl className="divide-y divide-line border-b border-line text-[13px]">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">Description</dt>
              <dd className="text-right">{payment.description}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">Reference</dt>
              <dd className="text-right">
                {payment.reference ?? payment.payment_id}
              </dd>
            </div>
          </dl>
          <p className="mt-5 font-mono text-xs break-all">
            {formatPaymentUrl(payment.payment_url)}
          </p>
          <p className="mt-4 text-xs text-muted">
            {payment.asset} on {networkLabel[payment.network]}. Scan the QR code
            to open this payment request.
          </p>
        </div>
      ) : null}
    </div>
  );
}
