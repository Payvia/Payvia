import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/merchant/page-header";
import { PaymentsList } from "@/components/merchant/payments-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/routes";

// Against the live backend the merchant loads in the browser, so the server
// renders the shell without this page and has nothing here to validate.
export const instant = false;

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="Payments"
        description="Track your payment requests and Stellar confirmations."
        action={
          <Button asChild>
            <Link href={routes.newPayment}>Create request</Link>
          </Button>
        }
      />
      {/* Reads the URL's search params, so it renders per request. */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-panel" />}>
        <PaymentsList />
      </Suspense>
    </>
  );
}
