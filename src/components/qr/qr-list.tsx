"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, QrCode } from "lucide-react";
import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/state";
import { queries } from "@/lib/api/queries";
import { formatAssetAmountCompact } from "@/lib/format";
import { stagger } from "@/lib/motion/tokens";
import { routes } from "@/lib/routes";
import { QRCode } from "./qr-code";

export function QRList() {
  // Only requests that can still be paid: a QR for a settled request is no use.
  const { data, error } = useQuery(queries.payments({ status: "PENDING" }));
  if (error) throw error;

  return (
    <Card className="max-w-2xl p-4 md:p-5">
      <p className="text-xs text-muted">Payment QR codes for your requests.</p>
      {!data ? (
        <div
          className="mt-4 flex flex-col gap-3"
          aria-busy
          aria-label="Loading QR codes"
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No QR codes yet"
          description={
            data.total === 0
              ? "Create a payment request to generate a QR code."
              : "QR codes appear here for requests that are waiting for payment."
          }
          action={
            <Button asChild size="sm">
              <Link href={routes.newPayment}>Create request</Link>
            </Button>
          }
        />
      ) : (
        <Stagger
          immediate
          gap={stagger.tight}
          className="mt-2 divide-y divide-line"
        >
          {data.items.map((payment) => (
            <StaggerItem key={payment.payment_id} y={8}>
              <Link
                href={routes.qr(payment.payment_id)}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-canvas"
              >
                <span aria-hidden className="shrink-0">
                  <QRCode
                    value={payment.payment_url}
                    size={36}
                    className="rounded-sm"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {payment.description}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {payment.reference ?? payment.payment_id}
                  </span>
                </span>
                <span className="shrink-0 text-[13px]">
                  {formatAssetAmountCompact(payment.amount, payment.asset)}
                </span>
                <ChevronRight className="size-4 shrink-0" aria-hidden />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Card>
  );
}
