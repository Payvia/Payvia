"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SubmitButton } from "@/components/ui/submit-button";
import { api, ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import {
  amountSchema,
  stellarAddressSchema,
  type Attempt,
  type Payment,
} from "@/lib/api/schemas";
import {
  formatAssetAmount,
  formatDateTime,
  truncateWallet,
} from "@/lib/format";
import { freighter } from "@/lib/stellar/freighter";
import { WalletError } from "@/lib/stellar/wallet";

// What actually arrived on-chain for a request, and sending some of it back.
// A refund is a payment from the merchant's receiving wallet, so the merchant
// signs it; PayVia never holds the funds.

const attemptLabel: Partial<
  Record<Attempt["status"], { label: string; tone: BadgeTone }>
> = {
  CONFIRMED: { label: "Counted", tone: "info" },
  MISMATCH: { label: "Did not match", tone: "danger" },
  DUPLICATE: { label: "Duplicate", tone: "danger" },
};

const refundLabel: Record<string, string> = {
  PREPARED: "Not sent yet",
  SUBMITTED: "Being confirmed",
  CONFIRMED: "Refunded",
  FAILED: "Failed",
  ABANDONED: "Not sent",
};

const mismatchReason: Record<string, string> = {
  WRONG_AMOUNT: "The amount was not the amount requested.",
  WRONG_ASSET: "It was sent in a different asset.",
  ALREADY_PAID: "The request had already been paid.",
  REQUEST_CANCELLED: "The request had been cancelled.",
};

function failure(error: unknown) {
  if (error instanceof WalletError) {
    return error.kind === "not_installed"
      ? "Freighter was not found in this browser. Send the refund from your wallet and record it here instead."
      : "The refund was not approved in your wallet.";
  }
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

function RefundDialog({
  payment,
  attempt,
  open,
  onOpenChange,
}: {
  payment: Payment;
  attempt: Attempt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const refundable = attempt.refundable_amount ?? "0";
  const [mode, setMode] = useState<"send" | "record">("send");
  const [amount, setAmount] = useState(refundable);
  const [destination, setDestination] = useState(attempt.customer_wallet ?? "");
  const [memo, setMemo] = useState("");
  const [hash, setHash] = useState("");
  const [touched, setTouched] = useState(false);

  const amountValid =
    amountSchema.safeParse(amount.trim()).success && Number(amount) > 0;
  const destinationValid = stellarAddressSchema.safeParse(
    destination.trim(),
  ).success;
  const hashValid = /^[0-9a-f]{64}$/.test(hash.trim().toLowerCase());

  const refund = useMutation({
    mutationFn: async () => {
      if (mode === "record") {
        return api.payments.recordRefund(
          payment.payment_id,
          attempt.attempt_id,
          hash.trim().toLowerCase(),
        );
      }
      const prepared = await api.payments.prepareRefund(
        payment.payment_id,
        attempt.attempt_id,
        {
          amount: amount.trim(),
          destination: destination.trim(),
          memo: memo.trim(),
        },
      );
      // Signed by the wallet the request was paid to: the funds are there.
      const signed = await freighter.signTransaction(prepared.xdr, {
        networkPassphrase: prepared.network_passphrase,
        address: payment.recipient_wallet,
      });
      return api.payments.submitRefund(
        payment.payment_id,
        prepared.refund_id,
        signed,
      );
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: queries.payment(payment.payment_id).queryKey,
      });
      onOpenChange(false);
      toast.success(
        result.status === "CONFIRMED"
          ? "Refund recorded"
          : "Refund sent. It will show here once Stellar confirms it.",
      );
    },
  });

  const ready = mode === "record" ? hashValid : amountValid && destinationValid;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!refund.isPending) onOpenChange(next);
      }}
      title="Refund payment"
      description={`Up to ${formatAssetAmount(refundable, payment.asset)} can be sent back for this payment.`}
    >
      <form
        method="post"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (ready) refund.mutate();
        }}
      >
        <SegmentedControl
          aria-label="How to refund"
          value={mode}
          onValueChange={(next) => {
            if (!refund.isPending) setMode(next);
          }}
          segments={[
            {
              value: "send",
              label: "Send now",
              description: "Sign with Freighter",
            },
            {
              value: "record",
              label: "Already sent",
              description: "Record its hash",
            },
          ]}
        />
        {mode === "send" ? (
          <>
            {attempt.payer_may_be_exchange ? (
              <Banner tone="danger" title="Check where to send it">
                This payment may have come from an exchange, not the
                customer&apos;s own wallet. Ask your customer for the address
                and memo to refund to.
              </Banner>
            ) : null}
            <Field
              label={`Amount (${payment.asset})`}
              error={
                touched && !amountValid ? "Enter a valid amount." : undefined
              }
            >
              {(control) => (
                <Input
                  {...control}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                />
              )}
            </Field>
            <Field
              label="Send to"
              hint="The wallet that paid, unless you change it."
              error={
                touched && !destinationValid
                  ? "Enter a valid Stellar wallet address."
                  : undefined
              }
            >
              {(control) => (
                <Input
                  {...control}
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono md:text-xs"
                />
              )}
            </Field>
            <Field
              label="Memo"
              optional
              hint="Needed when refunding to an exchange."
            >
              {(control) => (
                <Input
                  {...control}
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  maxLength={28}
                  autoComplete="off"
                />
              )}
            </Field>
            <p className="text-xs text-muted">
              Freighter will ask you to approve a payment from{" "}
              <span className="font-mono">
                {truncateWallet(payment.recipient_wallet)}
              </span>
              , the wallet this request was paid to.
            </p>
          </>
        ) : (
          <Field
            label="Transaction hash"
            hint="Of a refund you sent from the receiving wallet yourself. It is checked on Stellar before it is recorded."
            error={
              touched && !hashValid
                ? "Enter the 64-character transaction hash."
                : undefined
            }
          >
            {(control) => (
              <Input
                {...control}
                value={hash}
                onChange={(event) => setHash(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono md:text-xs"
              />
            )}
          </Field>
        )}
        {refund.error ? (
          <Banner tone="danger">{failure(refund.error)}</Banner>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={refund.isPending}
          >
            Close
          </Button>
          <SubmitButton loading={refund.isPending}>
            {mode === "send" ? "Sign and send refund" : "Record refund"}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

function AttemptRow({
  payment,
  attempt,
}: {
  payment: Payment;
  attempt: Attempt;
}) {
  const [open, setOpen] = useState(false);
  const meta = attemptLabel[attempt.status];
  if (!meta) return null;

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[13px]">
            {attempt.amount_received
              ? formatAssetAmount(
                  attempt.amount_received,
                  attempt.asset_received ?? payment.asset,
                )
              : "Payment"}
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {attempt.overpaid_by ? (
              <Badge>
                Overpaid by{" "}
                {formatAssetAmount(attempt.overpaid_by, payment.asset)}
              </Badge>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {formatDateTime(attempt.created_at)}
            {attempt.customer_wallet
              ? ` · from ${truncateWallet(attempt.customer_wallet)}`
              : null}
          </p>
          {attempt.status !== "CONFIRMED" && attempt.failure_code ? (
            <p className="mt-0.5 text-xs text-muted">
              {mismatchReason[attempt.failure_code] ??
                "It could not be counted towards this request."}
            </p>
          ) : null}
        </div>
        {attempt.refundable_amount ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Refund
          </Button>
        ) : null}
      </div>
      {attempt.refunds.length ? (
        <ul className="mt-2 flex flex-col gap-1 border-l border-line pl-3">
          {attempt.refunds.map((refund) => (
            <li key={refund.refund_id} className="text-xs text-muted">
              {refundLabel[refund.status] ?? refund.status}:{" "}
              {formatAssetAmount(refund.amount, payment.asset)} to{" "}
              <span className="font-mono">
                {truncateWallet(refund.destination)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {attempt.refundable_amount ? (
        <RefundDialog
          // Remount with the attempt's current figures each time it opens.
          key={`${open}:${attempt.refundable_amount}`}
          payment={payment}
          attempt={attempt}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </li>
  );
}

/** Payments received for a request, with what can be refunded. */
export function PaymentsReceived({ payment }: { payment: Payment }) {
  const received = (payment.attempts ?? []).filter(
    (attempt) => attemptLabel[attempt.status],
  );
  // One exact payment needs no table: the request itself says it all.
  const plain =
    received.length === 1 &&
    received[0].status === "CONFIRMED" &&
    !received[0].refundable_amount &&
    !received[0].refunds.length;
  if (!received.length || plain) return null;

  return (
    <section className="mt-5">
      <h2 className="text-sm">Payments received</h2>
      {payment.refundable_amount ? (
        <Banner className="mt-2" title="Money to send back">
          {formatAssetAmount(payment.refundable_amount, payment.asset)} arrived
          that this request did not ask for. Refund it to your customer.
        </Banner>
      ) : null}
      <ul className="mt-1 divide-y divide-line">
        {received.map((attempt) => (
          <AttemptRow
            key={attempt.attempt_id}
            payment={payment}
            attempt={attempt}
          />
        ))}
      </ul>
    </section>
  );
}
