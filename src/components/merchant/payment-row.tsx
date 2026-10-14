import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PaymentSummary } from "@/lib/api/schemas";
import { formatAssetAmountCompact } from "@/lib/format";
import { routes } from "@/lib/routes";

/** Compact payment line used on the dashboard and in mobile lists. */
export function PaymentRow({ payment }: { payment: PaymentSummary }) {
  return (
    <Link
      href={routes.payment(payment.payment_id)}
      className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-canvas"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm">{payment.description}</span>
        <span className="block truncate text-xs text-muted">
          {payment.reference ?? payment.payment_id}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5 md:flex-row md:items-center md:gap-4">
        <span className="text-[13px]">
          {formatAssetAmountCompact(payment.amount, payment.asset)}
        </span>
        <StatusBadge status={payment.status} />
      </span>
    </Link>
  );
}
