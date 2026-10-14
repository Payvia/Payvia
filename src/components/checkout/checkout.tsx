"use client";

import { Store } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useState, type ReactNode } from "react";
import { QRCode } from "@/components/qr/qr-code";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Sheet } from "@/components/ui/dialog";
import type { PublicPayment } from "@/lib/api/schemas";
import type { Phase } from "@/lib/checkout/machine";
import { cn } from "@/lib/cn";
import { formatPaymentUrl } from "@/lib/format";
import { duration, ease, spring } from "@/lib/motion/tokens";
import { Hero, type HeroTone } from "./hero";
import { ClockIllustration, LockIllustration } from "./illustrations";
import {
  AlreadyPaidPanel,
  ConfirmingPanel,
  DetailsPanel,
  FailedPanel,
  InactivePanel,
  PaidPanel,
  ReviewPanel,
  SigningPanel,
  WalletAppPanel,
} from "./panels";
import { useCheckout, type Checkout as CheckoutApi } from "./use-checkout";
import { WalletSheet } from "./wallet-sheet";

const toneFor: Record<Phase, HeroTone> = {
  idle: "brand",
  connected: "brand",
  reviewing: "brand",
  signing: "brand",
  submitting: "brand",
  confirming: "brand",
  external: "brand",
  in_progress: "brand",
  paid: "success",
  already_paid: "success",
  failed: "danger",
  expired: "soft",
  cancelled: "soft",
};

const statusChip: Partial<Record<Phase, string>> = {
  paid: "Paid",
  already_paid: "Already paid",
  failed: "Payment Failed",
  expired: "Link Expired",
  cancelled: "Link Cancelled",
};

// Phases that share a panel should not re-animate when moving between them.
const panelKey: Record<Phase, string> = {
  idle: "details",
  connected: "details",
  reviewing: "review",
  signing: "signing",
  submitting: "confirming",
  confirming: "confirming",
  in_progress: "in-progress",
  external: "external",
  paid: "paid",
  already_paid: "already-paid",
  failed: "failed",
  expired: "expired",
  cancelled: "cancelled",
};

function Panel({ checkout }: { checkout: CheckoutApi }): ReactNode {
  const { phase, payment } = checkout;
  switch (phase) {
    case "idle":
    case "connected":
      return <DetailsPanel checkout={checkout} />;
    case "reviewing":
      return <ReviewPanel checkout={checkout} />;
    case "signing":
      return <SigningPanel checkout={checkout} />;
    case "submitting":
    case "confirming":
      return <ConfirmingPanel />;
    case "in_progress":
      return <ConfirmingPanel someoneElse />;
    case "external":
      return <WalletAppPanel checkout={checkout} />;
    case "paid":
      return <PaidPanel payment={payment} />;
    case "already_paid":
      return <AlreadyPaidPanel payment={payment} />;
    case "failed":
      return <FailedPanel checkout={checkout} />;
    case "expired":
      return <InactivePanel payment={payment} />;
    case "cancelled":
      return <InactivePanel payment={payment} cancelled />;
  }
}

function ScanSheet({
  payment,
  open,
  onOpenChange,
}: {
  payment: PublicPayment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Scan QR Code"
      description="Scan with another device to open this payment request there."
      className="text-center"
    >
      <div className="mx-auto flex w-fit rounded-2xl bg-field p-4">
        <QRCode value={payment.payment_url} size={220} />
      </div>
      <p className="mt-4 flex items-center justify-center gap-1 font-mono text-xs">
        <span className="truncate">
          {formatPaymentUrl(payment.payment_url)}
        </span>
        <CopyButton value={payment.payment_url} label="payment link" />
      </p>
    </Sheet>
  );
}

export function Checkout({ initial }: { initial: PublicPayment }) {
  const checkout = useCheckout(initial);
  const { phase, payment } = checkout;
  const [scanOpen, setScanOpen] = useState(false);

  const choosing = phase === "idle" || phase === "connected";
  const signing = phase === "signing";
  const confirming =
    phase === "submitting" || phase === "confirming" || phase === "in_progress";
  const tone = toneFor[phase];
  const nothingDue = phase === "expired" || phase === "cancelled";

  return (
    <div className="min-h-dvh bg-canvas print:bg-white">
      <Hero
        tone={tone}
        chip={
          statusChip[phase] ?? (
            <>
              <Store className="size-3.5" aria-hidden />
              {payment.merchant_name}
            </>
          )
        }
        label={
          nothingDue || phase === "already_paid" ? undefined : "Amount due"
        }
        amount={payment.amount}
        asset={payment.asset}
        description={payment.description}
        illustration={
          signing ? (
            <LockIllustration />
          ) : confirming ? (
            <ClockIllustration />
          ) : undefined
        }
        actions={
          choosing ? (
            <>
              {phase === "idle" ? (
                <Button
                  size="lg"
                  pill
                  className="bg-white/20 text-white hover:bg-white/30"
                  onClick={checkout.openWallets}
                >
                  Connect Stellar Wallet
                </Button>
              ) : (
                <Button
                  size="lg"
                  pill
                  className="bg-white/20 text-white hover:bg-white/30"
                  onClick={checkout.review}
                >
                  Review payment
                </Button>
              )}
              <Button
                size="lg"
                pill
                className="bg-white text-brand hover:bg-white/90"
                onClick={() => setScanOpen(true)}
              >
                Scan QR Code
              </Button>
            </>
          ) : undefined
        }
      />

      <main
        className={cn(
          "relative mx-auto -mt-20 w-full px-0 pb-10 transition-[max-width] duration-500 sm:px-5",
          choosing ? "max-w-3xl" : "max-w-md",
        )}
      >
        <m.div
          layout
          transition={spring.ui}
          initial={{ y: 80, opacity: 0 }}
          animate={
            phase === "failed"
              ? { y: 0, opacity: 1, x: [0, -6, 6, -4, 4, 0] }
              : { y: 0, opacity: 1, x: 0 }
          }
          className="min-h-[45dvh] overflow-hidden rounded-t-sheet bg-surface p-6 sm:min-h-0 sm:rounded-b-sheet"
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={panelKey[phase]}
              layout="position"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: duration.base, ease: ease.out }}
            >
              <Panel checkout={checkout} />
            </m.div>
          </AnimatePresence>
        </m.div>
      </main>

      <WalletSheet checkout={checkout} />
      <ScanSheet payment={payment} open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  );
}
