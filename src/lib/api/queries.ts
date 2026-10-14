import { queryOptions } from "@tanstack/react-query";
import { isTerminal } from "@/lib/status";
import { api } from "./index";
import type {
  ListParams,
  PaymentStatus,
  PaymentSummary,
  PublicPayment,
} from "./schemas";

/** Poll faster while a payment is being confirmed, stop once it is settled. */
export function pollInterval(status: PaymentStatus | undefined) {
  if (!status || isTerminal(status)) return false;
  return status === "PROCESSING" ? 3_000 : 15_000;
}

const anyLive = (payments: PaymentSummary[] | undefined) =>
  payments?.some((p) => p.status === "PROCESSING")
    ? 3_000
    : payments?.some((p) => !isTerminal(p.status))
      ? 15_000
      : false;

export const queries = {
  me: () => queryOptions({ queryKey: ["me"], queryFn: api.auth.me }),

  summary: () =>
    queryOptions({
      queryKey: ["payments", "summary"],
      queryFn: api.payments.summary,
      refetchInterval: 15_000,
    }),

  payments: (params: ListParams = {}) =>
    queryOptions({
      queryKey: ["payments", "list", params],
      queryFn: ({ signal }) => api.payments.list(params, signal),
      refetchInterval: (query) => anyLive(query.state.data?.items),
    }),

  payment: (paymentId: string) =>
    queryOptions({
      queryKey: ["payments", "detail", paymentId],
      queryFn: () => api.payments.get(paymentId),
      refetchInterval: (query) => pollInterval(query.state.data?.status),
    }),

  checkout: (slug: string) =>
    queryOptions({
      queryKey: ["checkout", slug],
      // Loaded in full once; after that only the status is re-read.
      queryFn: async ({ client, queryKey }): Promise<PublicPayment> => {
        const current = client.getQueryData<PublicPayment>(queryKey);
        if (!current) return api.checkout.get(slug);
        const { status, paid_at, transaction_hash, failure_reason } =
          await api.checkout.status(slug);
        // Named one by one so a cleared field, such as an old failure, clears.
        return {
          ...current,
          status,
          paid_at,
          transaction_hash,
          failure_reason,
        };
      },
      refetchInterval: (query) => pollInterval(query.state.data?.status),
    }),
};
