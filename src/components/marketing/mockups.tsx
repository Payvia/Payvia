import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Search,
  Signal,
  Store,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// Static, non-interactive miniatures of the product, built from the same
// tokens as the real screens. They are decoration: hidden from assistive tech.

function StatusBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 pt-3 pb-2 text-[13px] font-medium",
        className,
      )}
    >
      05:31
      <span className="flex items-center gap-1.5">
        <Signal className="size-3.5" />
        <Wifi className="size-3.5" />
        <span className="h-2.5 w-5 rounded-[3px] bg-current" />
      </span>
    </div>
  );
}

export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "w-[21rem] overflow-hidden rounded-t-[1.75rem] shadow-2xl shadow-black/20 select-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

function AppBar() {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className="text-xl tracking-tight">PayVia</span>
      <span className="flex items-center gap-2.5">
        <Search className="size-4" strokeWidth={1.75} />
        <CircleHelp className="size-4" strokeWidth={1.75} />
        <Bell className="size-4" strokeWidth={1.75} />
        <span className="h-4 w-px bg-line" />
        <Image
          src="/images/avatar-placeholder.jpg"
          alt=""
          width={28}
          height={28}
          className="rounded-full"
        />
        <ChevronDown className="size-3.5" />
      </span>
    </div>
  );
}

function SummaryLine({
  icon,
  label,
  value,
  text,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-field">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2 text-sm">
          {label} <span className="text-[11px] text-muted">{value}</span>
        </span>
        <span className="block truncate text-[11px] text-muted">{text}</span>
      </span>
      <ChevronRight className="size-3.5" />
    </div>
  );
}

/** The merchant dashboard on a phone. `total` lets the hero animate the figure. */
export function DashboardMock({
  className,
  total = "$4,250.00",
  appBar = true,
}: {
  className?: string;
  total?: ReactNode;
  appBar?: boolean;
}) {
  return (
    <PhoneFrame className={cn("bg-surface text-ink", className)}>
      <StatusBar className="bg-canvas" />
      {appBar ? (
        <AppBar />
      ) : (
        <p className="px-6 pt-4 text-xl tracking-tight">PayVia</p>
      )}
      <div className="px-6 pt-3 pb-6">
        <p className="flex items-center gap-2 text-[11px] tracking-[0.04em] text-muted uppercase">
          Total requested
          <Badge tone="danger" className="h-5 tracking-normal normal-case">
            Testnet
          </Badge>
        </p>
        <p className="mt-1 text-[2.5rem] leading-none font-semibold tracking-tight">
          {total}
        </p>
        <p className="mt-3 text-[11px] text-muted">
          Total value of your payment requests in{" "}
          <span className="text-ink underline underline-offset-4">USDC</span>
        </p>
        <div className="mt-4 flex gap-2">
          <span className="flex h-10 items-center rounded-xl bg-ink px-4 text-sm text-white">
            Create request
          </span>
          <span className="flex h-10 items-center rounded-xl border border-line px-4 text-sm">
            View payments
          </span>
        </div>
        <p className="mt-6 text-[11px] tracking-[0.04em] text-muted uppercase">
          Summary
        </p>
        <div className="mt-2 rounded-panel border border-line px-3 py-1">
          <SummaryLine
            icon={<Check className="size-4" strokeWidth={1.75} />}
            label="Paid"
            value="$2,850 USDC"
            text="Confirmed payments across all requests"
          />
          <SummaryLine
            icon={<Clock className="size-4" strokeWidth={1.75} />}
            label="Pending"
            value="$1,400 USDC"
            text="Payment requests awaiting confirmation"
          />
        </div>
      </div>
    </PhoneFrame>
  );
}

/** The customer payment page on a phone. */
export function CheckoutMock({ className }: { className?: string }) {
  return (
    <PhoneFrame className={cn("bg-brand text-white", className)}>
      <StatusBar className="bg-white text-ink" />
      <p className="px-6 pt-4 text-xl tracking-tight">PayVia</p>
      <div className="flex flex-col items-center px-6 pt-8 pb-10 text-center">
        <span className="flex h-7 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs">
          <Store className="size-3.5" />
          ABC Digital
        </span>
        <p className="mt-4 text-xs opacity-90">Amount due</p>
        <p className="mt-1 flex items-baseline gap-2 text-[3.25rem] leading-none font-semibold tracking-[-0.04em]">
          $150.00{" "}
          <span className="text-base font-normal tracking-normal">USDC</span>
        </p>
        <p className="mt-2 text-xs opacity-90">Website Design, Final Payment</p>
        <span className="mt-6 flex h-12 items-center rounded-full bg-white/20 px-6 text-sm">
          Connect Stellar Wallet
        </span>
      </div>
      <div className="h-24 rounded-t-sheet bg-surface" />
    </PhoneFrame>
  );
}
