"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  Ban,
  Download,
  Hourglass,
  Link2,
  Search,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/state";
import { StatusBadge } from "@/components/ui/status-badge";
import { api, ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import {
  statusFilters,
  type PaymentSummary,
  type PaymentStatus,
  type StatusFilter,
} from "@/lib/api/schemas";
import { cn } from "@/lib/cn";
import { formatAssetAmountCompact, formatDateShort } from "@/lib/format";
import { features } from "@/lib/features";
import { downloadBlob } from "@/lib/qr";
import { routes } from "@/lib/routes";
import { PaymentRow } from "./payment-row";

const filterSegments = statusFilters.map((value) => ({
  value,
  label: value[0] + value.slice(1).toLowerCase(),
}));

const statusIcon: Record<
  PaymentStatus,
  { icon: LucideIcon; className: string }
> = {
  PAID: { icon: ArrowDownLeft, className: "bg-brand-soft text-brand" },
  PROCESSING: { icon: ArrowDownLeft, className: "bg-brand-soft text-brand" },
  CREATED: { icon: Hourglass, className: "bg-field text-muted" },
  PENDING: { icon: Hourglass, className: "bg-field text-muted" },
  FAILED: { icon: X, className: "bg-field text-muted" },
  EXPIRED: { icon: X, className: "bg-field text-muted" },
  CANCELLED: { icon: Ban, className: "bg-field text-muted" },
};

function parseFilter(value: string | null): StatusFilter {
  return statusFilters.includes(value as StatusFilter)
    ? (value as StatusFilter)
    : "ALL";
}

function PaymentTable({ payments }: { payments: PaymentSummary[] }) {
  const router = useRouter();
  return (
    <table className="hidden w-full text-left text-[13px] md:table">
      <thead>
        <tr className="text-[11px] tracking-[0.04em] text-muted uppercase">
          <th scope="col" className="py-3 font-normal">
            Payment request
          </th>
          <th scope="col" className="py-3 text-right font-normal">
            Amount
          </th>
          <th scope="col" className="py-3 pl-8 font-normal">
            Customer
          </th>
          <th scope="col" className="py-3 font-normal">
            Date
          </th>
          <th scope="col" className="py-3 text-right font-normal">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {payments.map((payment) => {
          const { icon: Icon, className } = statusIcon[payment.status];
          const href = routes.payment(payment.payment_id);
          return (
            <tr
              key={payment.payment_id}
              onClick={() => router.push(href)}
              className="cursor-pointer transition-colors hover:bg-canvas"
            >
              <td className="py-3">
                <Link href={href} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      className,
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">
                      {payment.description}
                    </span>
                    <span className="block text-xs text-muted">
                      {payment.reference ?? payment.payment_id}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="py-3 text-right whitespace-nowrap">
                {formatAssetAmountCompact(payment.amount, payment.asset)}
              </td>
              <td className="py-3 pl-8">{payment.customer_name ?? "—"}</td>
              <td className="py-3 whitespace-nowrap">
                {formatDateShort(payment.created_at)}
              </td>
              <td className="py-3 text-right">
                <StatusBadge status={payment.status} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Downloads the requests matching the current search and filter as CSV. */
function ExportButton({ status, q }: { status: StatusFilter; q: string }) {
  const download = useMutation({
    mutationFn: () => api.payments.exportCsv({ status, q }),
    onSuccess: (csv) =>
      downloadBlob(
        new Blob([csv], { type: "text/csv" }),
        `payvia-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      ),
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not export your payments. Please try again.",
      ),
  });
  return (
    <Button
      size="sm"
      variant="outline"
      loading={download.isPending}
      onClick={() => download.mutate()}
    >
      {download.isPending ? null : (
        <Download className="size-3.5" aria-hidden />
      )}
      Export CSV
    </Button>
  );
}

export function PaymentsList() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = parseFilter(searchParams.get("status"));
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  // Keep the field in step with the URL (top-bar search, back button).
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    // Ignore our own debounced write, so typing "web " is not trimmed mid-word.
    if (q !== draft.trim()) setDraft(q);
  }

  function setParams(next: { status?: StatusFilter; q?: string }) {
    // Start from the live URL, not this render's snapshot: a debounced search
    // can fire after the filter has already changed. replaceState updates the
    // URL synchronously (and Next keeps useSearchParams in step), so the next
    // read always sees this write.
    const params = new URLSearchParams(window.location.search);
    if (next.status !== undefined) {
      if (next.status === "ALL") params.delete("status");
      else params.set("status", next.status);
    }
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname,
    );
  }

  // Debounce typing so each keystroke is not a request.
  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === q) return;
    const timeout = setTimeout(() => setParams({ q: trimmed }), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const { data, error, isPlaceholderData } = useQuery({
    ...queries.payments({ status, q }),
    placeholderData: keepPreviousData,
  });
  if (error) throw error;

  const filtering = status !== "ALL" || q !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Search payments"
          placeholder="Search payments"
          className="h-11 w-full rounded-full bg-field pr-11 pl-4 text-base outline-none placeholder:text-ink focus-visible:ring-2 focus-visible:ring-brand md:text-[13px]"
        />
        <Search
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
          aria-hidden
        />
      </div>

      <SegmentedControl
        aria-label="Filter by status"
        segments={filterSegments}
        value={status}
        onValueChange={(next) => setParams({ status: next })}
      />

      <Card className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm">Payment history</h2>
            <p className="text-xs text-muted">
              Latest requests and their current payment status.
            </p>
          </div>
          {features.backend && data?.items.length ? (
            <ExportButton status={status} q={q} />
          ) : null}
        </div>

        {!data ? (
          <div
            className="mt-4 flex flex-col gap-3"
            aria-busy
            aria-label="Loading payments"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.total === 0 ? (
          <EmptyState
            icon={Link2}
            title="No payment requests yet"
            description="Create a payment request to get a link and QR code you can share."
            action={
              <Button asChild size="sm">
                <Link href={routes.newPayment}>Create request</Link>
              </Button>
            }
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No results"
            description={
              q
                ? `Nothing matches "${q}". Try a different search or filter.`
                : "No payment requests have this status."
            }
            action={
              filtering ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraft("");
                    setParams({ status: "ALL", q: "" });
                  }}
                >
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <div
            className={cn(
              "mt-2 transition-opacity duration-150",
              isPlaceholderData && "opacity-50",
            )}
          >
            <PaymentTable payments={data.items} />
            <ul className="divide-y divide-line md:hidden">
              {data.items.map((payment) => (
                <li key={payment.payment_id}>
                  <PaymentRow payment={payment} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
