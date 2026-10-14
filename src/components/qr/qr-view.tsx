"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useMerchant } from "@/components/merchant/merchant-provider";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import type { Payment } from "@/lib/api/schemas";
import { routes } from "@/lib/routes";
import { isPayable, statusMeta } from "@/lib/status";
import { ScanCard } from "./scan-card";
import { useQrActions } from "./use-qr-actions";

function usePayment(paymentId: string) {
  const { data, error } = useQuery({
    ...queries.payment(paymentId),
    retry: (count, err) =>
      !(err instanceof ApiError && err.status === 404) && count < 1,
  });
  const notFound = error instanceof ApiError && error.status === 404;
  if (error && !notFound) throw error;
  return { payment: data, notFound };
}

function NotFound() {
  return (
    <ErrorState
      className="max-w-md"
      title="We couldn't find this payment request"
      description="The link may be wrong, or the request may belong to another account."
      action={
        <Button asChild size="sm">
          <Link href={routes.qrCodes}>Back to QR codes</Link>
        </Button>
      }
    />
  );
}

/** Explains why a QR code is no longer worth sharing. */
function InactiveNotice({ payment }: { payment: Payment }) {
  if (isPayable(payment.status)) return null;
  return (
    <Banner
      tone={payment.status === "PAID" ? "success" : "danger"}
      title={statusMeta[payment.status].label}
      className="mx-auto mb-4 max-w-sm print:hidden"
    >
      {payment.status === "PAID" || payment.status === "PROCESSING"
        ? "This request has already been paid, so the QR code is no longer needed."
        : "This request is no longer active. Customers who scan this code cannot pay."}
    </Banner>
  );
}

function Actions({ payment }: { payment: Payment }) {
  const merchant = useMerchant();
  const { download, share, exportCanvas } = useQrActions(
    payment,
    merchant.business_name || merchant.name,
  );

  return (
    <div className="flex flex-col gap-2 md:flex-row">
      <Button asChild>
        <a href={payment.payment_url} target="_blank" rel="noreferrer">
          View
        </a>
      </Button>
      <Button variant="outline" onClick={download}>
        Download
      </Button>
      <Button variant="outline" onClick={share}>
        Share
      </Button>
      <Button asChild variant="outline">
        <Link href={`${routes.qrPrint(payment.payment_id)}?print=1`}>
          Print
        </Link>
      </Button>
      {exportCanvas}
    </div>
  );
}

export function QRView({ paymentId }: { paymentId: string }) {
  const { payment, notFound } = usePayment(paymentId);

  if (notFound) return <NotFound />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl tracking-tight">QR View</h1>
        {payment ? (
          <div className="hidden md:block">
            <Actions payment={payment} />
          </div>
        ) : null}
      </div>
      {payment ? (
        <>
          <div>
            <InactiveNotice payment={payment} />
            <ScanCard payment={payment} />
          </div>
          <div className="md:hidden">
            <Actions payment={payment} />
          </div>
        </>
      ) : (
        <Skeleton
          className="mx-auto h-[28rem] w-full max-w-sm rounded-panel"
          aria-busy
          aria-label="Loading QR code"
        />
      )}
    </div>
  );
}

export function QRPrint({
  paymentId,
  autoPrint,
}: {
  paymentId: string;
  autoPrint: boolean;
}) {
  const { payment, notFound } = usePayment(paymentId);
  const merchant = useMerchant();
  const printed = useRef(false);

  // Arriving from the Print button opens the print dialog once the card is on
  // screen. A plain visit or a reload does not.
  useEffect(() => {
    if (!autoPrint || !payment || printed.current) return;
    printed.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("print");
    window.history.replaceState(null, "", url);
    // Two frames so the QR code has painted before the dialog captures it.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }, [autoPrint, payment]);

  if (notFound) return <NotFound />;

  return (
    <div className="flex flex-col gap-6 print:block">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={routes.qr(paymentId)}
          className="flex items-center gap-1 text-[13px] hover:underline"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Back to QR view
        </Link>
        <Button onClick={() => window.print()} disabled={!payment}>
          Print
        </Button>
      </div>
      {payment ? (
        <>
          <InactiveNotice payment={payment} />
          <ScanCard
            payment={payment}
            variant="print"
            merchantName={merchant.business_name || merchant.name}
            className="print:border-0"
          />
        </>
      ) : (
        <Skeleton className="mx-auto h-[40rem] w-full max-w-md rounded-panel" />
      )}
    </div>
  );
}
