import type { PaymentStatus } from "@/lib/api/schemas";
import { statusMeta } from "@/lib/status";
import { Badge } from "./badge";

export function StatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const { label, tone } = statusMeta[status];
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}
