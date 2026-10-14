import type { BadgeTone } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/api/schemas";

type StatusMeta = {
  label: string;
  /** Badge colour in the merchant app. */
  tone: BadgeTone;
  /** One-line explanation, from PRD §12. */
  message: string;
};

export const statusMeta: Record<PaymentStatus, StatusMeta> = {
  CREATED: {
    label: "Pending",
    tone: "brand",
    message: "Waiting for payment.",
  },
  PENDING: {
    label: "Pending",
    tone: "brand",
    message: "Waiting for payment.",
  },
  PROCESSING: {
    label: "Processing",
    tone: "brand",
    message: "Your payment is being confirmed on Stellar.",
  },
  PAID: {
    label: "Paid",
    tone: "info",
    message: "Payment received successfully.",
  },
  FAILED: {
    label: "Failed",
    tone: "danger",
    message: "Payment could not be completed.",
  },
  EXPIRED: {
    label: "Expired",
    tone: "danger",
    message: "This payment request is no longer active.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "danger",
    message: "This payment request was cancelled.",
  },
};

/** A customer can still pay this request. */
export function isPayable(status: PaymentStatus) {
  return status === "CREATED" || status === "PENDING" || status === "FAILED";
}

/** No further status change is expected. */
export function isTerminal(status: PaymentStatus) {
  return status === "PAID" || status === "EXPIRED" || status === "CANCELLED";
}

/** The merchant may cancel this request. */
export function isCancellable(status: PaymentStatus) {
  return isPayable(status);
}
