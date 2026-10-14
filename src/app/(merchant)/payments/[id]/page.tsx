import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentDetails } from "@/components/merchant/payment-details";
import { Skeleton } from "@/components/ui/skeleton";

// Against the live backend the merchant loads in the browser, so the server
// renders the shell without this page and has nothing here to validate.
export const instant = false;

export const metadata: Metadata = { title: "Payment details" };

export default function PaymentDetailsPage({
  params,
}: PageProps<"/payments/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] rounded-panel" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentDetails paymentId={decodeURIComponent(id)} />;
}
