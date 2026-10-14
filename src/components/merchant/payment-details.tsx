"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCopy } from "@/hooks/use-copy";
import { api, ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import type { Payment } from "@/lib/api/schemas";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import {
  formatAssetAmount,
  formatDate,
  formatDateTime,
  formatPaymentUrl,
  truncateHash,
  truncateWallet,
} from "@/lib/format";
import { routes } from "@/lib/routes";
import { explorerTxUrl } from "@/lib/share";
import { isCancellable, isPayable, statusMeta } from "@/lib/status";
import { features } from "@/lib/features";
import { DetailList, DetailRow } from "./detail-list";
import { PaymentsReceived } from "./refunds";

const bannerTone = {
  info: "bg-info-soft text-info-ink",
  brand: "bg-brand-soft text-brand-ink",
  danger: "bg-danger-soft text-danger-ink",
  neutral: "bg-field text-ink",
  success: "bg-info-soft text-info-ink",
} as const;

const networkLabel = { TESTNET: "Stellar Testnet", PUBLIC: "Stellar" } as const;

function StatusBanner({ payment }: { payment: Payment }) {
  const meta = statusMeta[payment.status];
  return (
    <div role="status" className={cn("rounded-xl p-4", bannerTone[meta.tone])}>
      <p className="text-sm">{meta.label}</p>
      <p className="mt-0.5 text-xs">
        {payment.status === "FAILED" && payment.failure_reason
          ? payment.failure_reason
          : meta.message}
      </p>
    </div>
  );
}

function CancelDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api.payments.cancel(payment.payment_id),
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        queries.payment(payment.payment_id).queryKey,
        updated,
      );
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      onOpenChange(false);
      toast.success("Payment request cancelled");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!cancel.isPending) onOpenChange(next);
      }}
      title="Cancel payment request?"
      description="Your customer will no longer be able to pay with this link."
    >
      <DetailList className="border-y border-line">
        <DetailRow label="Description">{payment.description}</DetailRow>
        <DetailRow label="Amount">
          {formatAssetAmount(payment.amount, payment.asset)}
        </DetailRow>
        {payment.reference ? (
          <DetailRow label="Reference">{payment.reference}</DetailRow>
        ) : null}
      </DetailList>
      <p className="mt-3 text-xs text-muted">
        This cannot be undone. You can create a new request at any time.
      </p>
      {cancel.error ? (
        <Banner tone="danger" className="mt-3">
          {cancel.error instanceof ApiError
            ? cancel.error.message
            : "Could not cancel this request. Please try again."}
        </Banner>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={cancel.isPending}
        >
          Keep request
        </Button>
        <Button loading={cancel.isPending} onClick={() => cancel.mutate()}>
          Cancel request
        </Button>
      </div>
    </Dialog>
  );
}

/** Emails the payment link to the customer on the request. */
function EmailLinkButton({ payment }: { payment: Payment }) {
  const send = useMutation({
    mutationFn: () => api.payments.sendEmail(payment.payment_id),
    onSuccess: (sentTo) => toast.success(`Payment link sent to ${sentTo}`),
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not send the email. Please try again.",
      ),
  });
  return (
    <Button
      variant="outline"
      loading={send.isPending}
      onClick={() => send.mutate()}
    >
      Email link
    </Button>
  );
}

function Actions({ payment }: { payment: Payment }) {
  const copy = useCopy();
  const [cancelOpen, setCancelOpen] = useState(false);

  if (payment.status === "PAID" && payment.transaction_hash) {
    return (
      <Button asChild className="w-full md:w-auto">
        <a
          href={explorerTxUrl(env.explorerUrl, payment.transaction_hash)}
          target="_blank"
          rel="noreferrer"
        >
          View on Stellar Explorer
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </Button>
    );
  }

  if (isPayable(payment.status)) {
    return (
      <>
        <Button onClick={() => copy(payment.payment_url, "payment link")}>
          Copy link
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.qr(payment.payment_id)}>View QR</Link>
        </Button>
        {features.backend &&
        payment.customer_email &&
        payment.status === "PENDING" ? (
          <EmailLinkButton payment={payment} />
        ) : null}
        {isCancellable(payment.status) ? (
          <Button variant="outline" onClick={() => setCancelOpen(true)}>
            Cancel request
          </Button>
        ) : null}
        <CancelDialog
          payment={payment}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      </>
    );
  }

  if (payment.status === "EXPIRED" || payment.status === "CANCELLED") {
    return (
      <Button asChild>
        <Link href={routes.newPayment}>Create new request</Link>
      </Button>
    );
  }

  return null;
}

function Details({ payment }: { payment: Payment }) {
  return (
    <Card className="p-4 md:p-6">
      <StatusBanner payment={payment} />
      <h1 className="mt-5 text-base">{payment.description}</h1>
      <p className="mt-0.5 text-xs text-muted">
        {payment.reference ?? payment.payment_id} · Created{" "}
        {formatDate(payment.created_at)}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[1.75rem] leading-none font-semibold tracking-tight">
          {formatAssetAmount(payment.amount, payment.asset)}
        </p>
        <span className="flex items-center gap-2">
          {payment.overpaid_by ? (
            <Badge>
              Overpaid by{" "}
              {formatAssetAmount(payment.overpaid_by, payment.asset)}
            </Badge>
          ) : null}
          <StatusBadge status={payment.status} />
        </span>
      </div>

      <DetailList className="mt-4 border-b border-line">
        <DetailRow label="Payment link" mono>
          <span className="truncate">
            {formatPaymentUrl(payment.payment_url)}
          </span>
          <CopyButton value={payment.payment_url} label="payment link" />
        </DetailRow>
        <DetailRow label="Asset">
          <Badge>
            {payment.asset} on {networkLabel[payment.network]}
          </Badge>
        </DetailRow>
        <DetailRow label="Amount">
          {formatAssetAmount(payment.amount, payment.asset)}
        </DetailRow>
        <DetailRow label="Payment ID" mono>
          {payment.payment_id}
        </DetailRow>
        {payment.reference ? (
          <DetailRow label="Reference">{payment.reference}</DetailRow>
        ) : null}
        <DetailRow label="Description">{payment.description}</DetailRow>
        {payment.customer_name ? (
          <DetailRow label="Customer">{payment.customer_name}</DetailRow>
        ) : null}
        {payment.customer_email ? (
          <DetailRow label="Customer email">{payment.customer_email}</DetailRow>
        ) : null}
        {payment.note ? (
          <DetailRow label="Note to customer">{payment.note}</DetailRow>
        ) : null}
        {payment.customer_wallet ? (
          <DetailRow label="Customer wallet" mono>
            {truncateWallet(payment.customer_wallet)}
            <CopyButton
              value={payment.customer_wallet}
              label="customer wallet"
            />
          </DetailRow>
        ) : null}
        <DetailRow label="Merchant wallet" mono>
          {truncateWallet(payment.recipient_wallet)}
          <CopyButton
            value={payment.recipient_wallet}
            label="merchant wallet"
          />
        </DetailRow>
        <DetailRow label="Created date">
          {formatDate(payment.created_at)}
        </DetailRow>
        {payment.due_date ? (
          <DetailRow label="Due date">{formatDate(payment.due_date)}</DetailRow>
        ) : null}
        {payment.expires_at && payment.status !== "PAID" ? (
          <DetailRow
            label={payment.status === "EXPIRED" ? "Expired" : "Expires"}
          >
            {formatDateTime(payment.expires_at)}
          </DetailRow>
        ) : null}
        {payment.paid_at ? (
          <DetailRow label="Payment date">
            {formatDateTime(payment.paid_at)}
          </DetailRow>
        ) : null}
        {payment.transaction_hash ? (
          <DetailRow label="Transaction hash" mono>
            {truncateHash(payment.transaction_hash)}
            <CopyButton
              value={payment.transaction_hash}
              label="transaction hash"
            />
          </DetailRow>
        ) : null}
      </DetailList>

      <PaymentsReceived payment={payment} />

      <div className="mt-5 flex flex-wrap gap-2 empty:hidden">
        <Actions payment={payment} />
      </div>
    </Card>
  );
}

export function PaymentDetails({ paymentId }: { paymentId: string }) {
  const { data, error } = useQuery({
    ...queries.payment(paymentId),
    retry: (count, err) =>
      !(err instanceof ApiError && err.status === 404) && count < 1,
  });

  const notFound = error instanceof ApiError && error.status === 404;
  if (error && !notFound) throw error;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={routes.payments}
        className="flex items-center gap-1 self-start text-[13px] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden />
        Back to Payments
      </Link>
      {notFound ? (
        // merchant-ui/Error : Invalid link
        <ErrorState
          className="max-w-md"
          title="We couldn't find this payment request"
          description="The link may be wrong, or the request may belong to another account."
          action={
            <Button asChild size="sm">
              <Link href={routes.payments}>Back to Payments</Link>
            </Button>
          }
        />
      ) : data ? (
        <Details payment={data} />
      ) : (
        <Skeleton
          className="h-[32rem] rounded-panel"
          aria-busy
          aria-label="Loading payment"
        />
      )}
    </div>
  );
}
