"use client";

import {
  ArrowDownLeft,
  Check,
  Clock,
  ExternalLink,
  Info,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { QRCode } from "@/components/qr/qr-code";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { PublicPayment } from "@/lib/api/schemas";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import {
  formatAssetAmount,
  formatDate,
  formatDateTime,
  truncateHash,
  truncateWallet,
} from "@/lib/format";
import { explorerTxUrl } from "@/lib/share";
import { stellar } from "@/lib/stellar/config";
import { isRecoverable, problemCopy } from "@/lib/stellar/problems";
import type { Checkout } from "./use-checkout";

function Rows({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-line">{children}</dl>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 text-[13px]">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-right font-medium">
        {children}
      </dd>
    </div>
  );
}

function Heading({ title, id }: { title: string; id: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-base">{title}</h2>
      <p className="mt-0.5 text-xs text-muted">{id}</p>
    </div>
  );
}

function IconBadge({
  icon: Icon,
  tone = "neutral",
}: {
  icon: LucideIcon;
  tone?: "neutral" | "danger";
}) {
  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-full",
        tone === "danger" ? "bg-danger text-white" : "bg-field",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "info" | "danger";
  title?: string;
  children: ReactNode;
}) {
  if (tone === "info") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-brand-soft p-3 text-xs text-brand">
        <Info className="size-4 shrink-0" aria-hidden />
        {children}
      </p>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl bg-danger-soft p-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger text-white">
        <TriangleAlert className="size-[18px]" aria-hidden />
      </span>
      <div>
        {title ? <p className="text-sm text-danger-ink">{title}</p> : null}
        <p className="text-xs text-muted">{children}</p>
      </div>
    </div>
  );
}

/** Scripts cannot close a tab the customer opened themselves, so fall back. */
function CloseButton() {
  const router = useRouter();
  return (
    <Button
      variant="soft"
      size="lg"
      pill
      onClick={() => {
        window.close();
        // Still here: the browser refused. Send them somewhere sensible.
        setTimeout(() => router.push("/"), 150);
      }}
    >
      Close
    </Button>
  );
}

// ---------- idle and connected

export function DetailsPanel({ checkout }: { checkout: Checkout }) {
  const { payment, state } = checkout;
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <Heading title="Payment details" id={payment.payment_id} />
        <Rows>
          <Row label="Description">
            <span className="truncate">{payment.description}</span>
          </Row>
          {payment.reference ? (
            <Row label="Reference">{payment.reference}</Row>
          ) : null}
          <Row label="Recipient">{payment.merchant_name}</Row>
          {payment.due_date ? (
            <Row label="Due">{formatDate(payment.due_date)}</Row>
          ) : null}
          <Row label="Network">{stellar.networkLabel}</Row>
          {state.address ? (
            <Row label="Wallet">
              <span className="flex flex-col items-end">
                <span className="flex items-center gap-1">
                  {truncateWallet(state.address)}
                  <CopyButton value={state.address} label="wallet address" />
                </span>
                <button
                  type="button"
                  onClick={checkout.disconnect}
                  className="text-xs font-normal text-brand hover:underline"
                >
                  Disconnect
                </button>
              </span>
            </Row>
          ) : null}
        </Rows>
        {payment.note ? (
          <p className="mt-3 rounded-xl bg-field p-3 text-xs">
            <span className="block text-muted">
              Note from {payment.merchant_name}
            </span>
            {payment.note}
          </p>
        ) : null}
        <div className="mt-3">
          <Notice tone="info">
            You&apos;ll review everything before approving
          </Notice>
        </div>
      </div>
      <div className="hidden flex-col items-center gap-3 self-start rounded-2xl bg-field p-4 md:flex">
        <p className="text-xs">Scan QR Code</p>
        <QRCode value={payment.payment_url} size={168} />
      </div>
    </div>
  );
}

// ---------- reviewing

export function ReviewPanel({ checkout }: { checkout: Checkout }) {
  const { payment, state } = checkout;
  const amount = formatAssetAmount(payment.amount, payment.asset);
  const problem = state.problem
    ? problemCopy(state.problem, {
        amount,
        asset: payment.asset,
        merchant: payment.merchant_name,
        network: stellar.networkLabel,
      })
    : null;

  return (
    <div>
      <Heading title="Review Payment" id={payment.payment_id} />
      <Rows>
        <Row label="To">{payment.merchant_name}</Row>
        <Row label="Amount">{amount}</Row>
        {payment.reference ? (
          <Row label="Reference">{payment.reference}</Row>
        ) : null}
        <Row label="Network fee">
          {state.fee ? `${state.fee} XLM` : "Checking…"}
        </Row>
        <Row label="Network">{stellar.networkLabel}</Row>
      </Rows>

      {problem ? (
        <div className="mt-4">
          <Notice tone="danger" title={problem.title}>
            {problem.body}
          </Notice>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <Button
          variant="brand"
          size="lg"
          pill
          loading={state.checking}
          disabled={Boolean(state.problem)}
          onClick={checkout.approve}
        >
          {state.checking ? "Checking your wallet" : "Approve payment"}
        </Button>
        {state.problem && isRecoverable(state.problem) ? (
          <Button variant="soft" size="lg" pill onClick={checkout.review}>
            Check again
          </Button>
        ) : null}
        <Button variant="ghost" pill onClick={checkout.backToDetails}>
          Back
        </Button>
      </div>
    </div>
  );
}

// ---------- signing, confirming, in progress, wallet app

type ProgressProps = {
  icon: LucideIcon;
  title: string;
  /** Left and right captions under the bar. */
  stage: string;
  status: string;
  note?: string;
  action?: ReactNode;
};

export function ProgressPanel({
  icon,
  title,
  stage,
  status,
  note,
  action,
}: ProgressProps) {
  return (
    <div>
      <IconBadge icon={icon} />
      <p className="mt-5 max-w-[16rem] text-lg leading-snug" role="status">
        {title}
      </p>
      <ProgressBar label={stage} className="mt-4" />
      <div className="mt-2 flex justify-between text-xs">
        <span className="text-muted">{stage}</span>
        <span>{status}</span>
      </div>
      {note ? <p className="mt-4 text-xs text-muted">{note}</p> : null}
      {action ? <div className="mt-8 flex flex-col">{action}</div> : null}
    </div>
  );
}

export function SigningPanel({ checkout }: { checkout: Checkout }) {
  return (
    <ProgressPanel
      icon={Wallet}
      title="Approve the payment in your wallet"
      stage="Wallet signature"
      status="Waiting"
      action={
        <Button variant="soft" size="lg" pill onClick={checkout.cancelSigning}>
          Cancel
        </Button>
      }
    />
  );
}

export function ConfirmingPanel({
  someoneElse = false,
}: {
  someoneElse?: boolean;
}) {
  return (
    <ProgressPanel
      icon={Clock}
      title={
        someoneElse
          ? "A payment for this request is being confirmed on Stellar."
          : "Your payment is being confirmed on Stellar."
      }
      stage="Stellar confirmation"
      status="Processing"
      note={
        someoneElse
          ? "This page updates when it is confirmed."
          : "This usually takes a few seconds. You can keep this page open; it updates by itself."
      }
    />
  );
}

export function WalletAppPanel({ checkout }: { checkout: Checkout }) {
  return (
    <ProgressPanel
      icon={Wallet}
      title="Complete the payment in your wallet app"
      stage="Waiting for payment"
      status="Waiting"
      note="If no wallet app opened, this device has no Stellar wallet installed. Go back and choose another way to pay."
      action={
        <Button variant="soft" size="lg" pill onClick={checkout.leaveWalletApp}>
          Back
        </Button>
      }
    />
  );
}

// ---------- paid and already paid

function Receipt({ payment }: { payment: PublicPayment }) {
  return (
    <Rows>
      <Row label="Merchant">{payment.merchant_name}</Row>
      <Row label="Amount">
        {formatAssetAmount(payment.amount, payment.asset)}
      </Row>
      {payment.reference ? (
        <Row label="Reference">{payment.reference}</Row>
      ) : null}
      {payment.paid_at ? (
        <Row label="Date">{formatDateTime(payment.paid_at)}</Row>
      ) : null}
      {payment.transaction_hash ? (
        <Row label="Transaction ID">
          <a
            href={explorerTxUrl(env.explorerUrl, payment.transaction_hash)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-mono text-xs hover:underline"
          >
            {truncateHash(payment.transaction_hash)}
            <ExternalLink className="size-3 print:hidden" aria-hidden />
          </a>
          <span className="print:hidden">
            <CopyButton
              value={payment.transaction_hash}
              label="transaction ID"
            />
          </span>
        </Row>
      ) : null}
    </Rows>
  );
}

function ReceiptActions() {
  return (
    <div className="mt-6 flex gap-2 print:hidden">
      <Button
        variant="soft"
        size="lg"
        pill
        className="flex-1"
        onClick={() => window.print()}
      >
        <ArrowDownLeft className="size-4" aria-hidden />
        Download receipt
      </Button>
      <CloseButton />
    </div>
  );
}

export function PaidPanel({ payment }: { payment: PublicPayment }) {
  return (
    <div>
      <p role="status" className="sr-only">
        Payment received successfully.
      </p>
      <Heading title="Payment receipt" id={payment.payment_id} />
      <Receipt payment={payment} />
      <ReceiptActions />
    </div>
  );
}

export function AlreadyPaidPanel({ payment }: { payment: PublicPayment }) {
  return (
    <div>
      <IconBadge icon={Check} />
      <p className="mt-5 max-w-[17rem] text-lg leading-snug" role="status">
        This payment request has already been paid.
      </p>
      <div className="mt-4">
        <Receipt payment={payment} />
      </div>
      <ReceiptActions />
    </div>
  );
}

// ---------- failed, expired, cancelled

export function FailedPanel({ checkout }: { checkout: Checkout }) {
  return (
    <div>
      <IconBadge icon={TriangleAlert} />
      <p className="mt-5 text-lg leading-snug" role="status">
        Payment could not be completed
      </p>
      <div className="mt-3">
        <Heading title="Review Payment" id={checkout.payment.payment_id} />
      </div>
      <Notice tone="danger" title="Reason for error">
        {checkout.failure ?? "Something went wrong. Please try again."}
      </Notice>
      <div className="mt-6 flex gap-2">
        <Button
          variant="brand"
          size="lg"
          pill
          className="flex-1"
          onClick={checkout.retry}
        >
          Try again
        </Button>
        <CloseButton />
      </div>
    </div>
  );
}

export function InactivePanel({
  payment,
  cancelled = false,
}: {
  payment: PublicPayment;
  cancelled?: boolean;
}) {
  return (
    <div>
      <IconBadge icon={TriangleAlert} tone="danger" />
      <p className="mt-5 max-w-[18rem] text-lg leading-snug" role="status">
        {cancelled
          ? "This payment request was cancelled."
          : "This payment request is no longer active at this time."}
      </p>
      <p className="mt-5 flex items-center gap-2 rounded-xl bg-danger-soft p-3 text-xs text-danger-ink">
        <Info className="size-4 shrink-0" aria-hidden />
        Contact {payment.merchant_name} to request a new payment link.
      </p>
    </div>
  );
}
