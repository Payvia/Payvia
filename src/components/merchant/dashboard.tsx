"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Clock,
  Link2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/motion/count-up";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { InstallApp } from "@/components/pwa/install-app";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { statusMeta } from "@/lib/status";
import { queries } from "@/lib/api/queries";
import type { PaymentSummary, Summary } from "@/lib/api/schemas";
import { formatAmountCompact, formatDateShort } from "@/lib/format";
import { stagger } from "@/lib/motion/tokens";
import { features } from "@/lib/features";
import { routes } from "@/lib/routes";
import { useMerchant } from "./merchant-provider";
import { PaymentRow } from "./payment-row";

function SummaryRow({
  icon: Icon,
  label,
  value,
  description,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-canvas"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-field">
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2 text-sm">
          {label}
          <span className="text-xs text-muted">{value}</span>
        </span>
        <span className="block truncate text-xs text-muted">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}

function RecentActivity({ payments }: { payments: PaymentSummary[] }) {
  if (payments.length === 0) {
    return (
      <Card className="flex min-h-32 items-center justify-center p-6 text-center text-xs text-muted">
        No payments yet. Payment requests and confirmations will appear here.
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <ul className="flex flex-col gap-3">
        {payments.map((payment) => (
          <li key={payment.payment_id}>
            <p className="text-[13px]">{payment.description}</p>
            <p className="text-xs text-muted">
              {formatAmountCompact(payment.amount)} {payment.asset} ·{" "}
              {statusMeta[payment.status].label} ·{" "}
              {formatDateShort(payment.updated_at)}
            </p>
          </li>
        ))}
      </ul>
      <Button asChild className="self-start">
        <Link href={routes.payments}>View all</Link>
      </Button>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy
      aria-label="Loading dashboard"
    >
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-14 w-72" />
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
        <Skeleton className="h-48 rounded-panel" />
        <Skeleton className="h-48 rounded-panel" />
      </div>
    </div>
  );
}

function Overview({
  summary,
  recent,
}: {
  summary: Summary;
  recent: PaymentSummary[];
}) {
  const merchant = useMerchant();
  const empty = summary.payment_links === 0;
  const money = (amount: string) =>
    `$${formatAmountCompact(amount)} ${summary.asset}`;

  return (
    <div className="flex flex-col gap-8">
      <InstallApp dismissible />
      {merchant.recipient_wallet ? null : (
        <Banner
          tone="danger"
          title="Add your receiving wallet"
          action={
            <Button asChild size="sm" variant="outline" pill>
              <Link href={routes.settings}>Add wallet</Link>
            </Button>
          }
        >
          Add a Stellar receiving wallet before sharing payment requests.
        </Banner>
      )}
      {features.logo && empty && !merchant.logo_url ? (
        <div className="-mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Add your merchant name and logo so customers recognise your payment
            pages.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={routes.settings}>Complete profile</Link>
          </Button>
        </div>
      ) : null}

      <section aria-labelledby="total-requested">
        <div className="flex items-center gap-2">
          <Eyebrow id="total-requested">Total requested</Eyebrow>
          {merchant.network === "TESTNET" ? (
            <Badge tone="danger" className="h-5">
              Testnet
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 text-[2.5rem] leading-none font-semibold tracking-tight md:font-mono md:text-[3.5rem] md:tracking-tighter">
          <CountUp value={summary.total_requested} prefix="$" />
        </p>
        <p className="mt-3 text-xs text-muted">
          Total value of your payment requests in{" "}
          <span className="text-ink underline underline-offset-4">
            {summary.asset}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={routes.newPayment}>
              {empty ? "Create your first payment request" : "Create request"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.payments}>View payments</Link>
          </Button>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_17rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3">
            <Eyebrow>Summary</Eyebrow>
            <Card className="px-4 py-2">
              <SummaryRow
                icon={Check}
                label="Paid"
                value={money(summary.paid)}
                description="Confirmed payments across all requests"
                href={`${routes.payments}?status=PAID`}
              />
              <SummaryRow
                icon={Clock}
                label="Pending"
                value={money(summary.pending)}
                description="Payment requests awaiting confirmation"
                href={`${routes.payments}?status=PENDING`}
              />
              <SummaryRow
                icon={Link2}
                label="Payment links"
                value={String(summary.payment_links)}
                description="Shareable links created for your customers"
                href={routes.payments}
              />
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <Eyebrow>Payments</Eyebrow>
            <Card className="px-4 py-1">
              {empty ? (
                <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm">No payments yet</p>
                    <p className="text-xs text-muted">
                      Create your first request to get started.
                    </p>
                  </div>
                  <Link
                    href={routes.newPayment}
                    className="text-[13px] underline underline-offset-4"
                  >
                    Create your first payment request
                  </Link>
                </div>
              ) : (
                <Stagger
                  immediate
                  gap={stagger.tight}
                  className="divide-y divide-line"
                >
                  {recent.map((payment) => (
                    <StaggerItem key={payment.payment_id} y={8}>
                      <PaymentRow payment={payment} />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </Card>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3">
            <Eyebrow>Last 7 days</Eyebrow>
            <Card className="grid grid-cols-2 gap-4 p-4">
              <div>
                <Eyebrow>Payment volume</Eyebrow>
                <p className="mt-1 text-lg">
                  {formatAmountCompact(summary.last_7_days.volume)}{" "}
                  {summary.asset}
                </p>
              </div>
              <div>
                <Eyebrow>Payments</Eyebrow>
                <p className="mt-1 text-lg">{summary.last_7_days.payments}</p>
              </div>
            </Card>
          </section>
          <section className="flex flex-col gap-3">
            <Eyebrow>Recent activity</Eyebrow>
            <RecentActivity payments={recent} />
          </section>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const summary = useQuery(queries.summary());
  const recent = useQuery(queries.payments({ limit: 3 }));

  // Let the route's error boundary show "Something went wrong" with Retry.
  if (summary.error) throw summary.error;
  if (recent.error) throw recent.error;
  if (!summary.data || !recent.data) return <DashboardSkeleton />;

  return <Overview summary={summary.data} recent={recent.data.items} />;
}
