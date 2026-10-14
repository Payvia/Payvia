import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Checkout } from "@/components/checkout/checkout";
import { Wordmark } from "@/components/wordmark";
import { formatAssetAmount } from "@/lib/format";
import { noIndex } from "@/lib/seo";
import { site } from "@/lib/site";
import { getPublicPayment } from "./payment";

// The browser chrome continues the purple header of the checkout.
export const viewport: Viewport = { themeColor: site.brandColor };

export async function generateMetadata({
  params,
}: PageProps<"/pay/[id]">): Promise<Metadata> {
  const { id } = await params;
  const payment = await getPublicPayment(id);

  // Payment pages are private to whoever holds the link.
  const robots = noIndex;
  if (!payment) return { title: "Payment request not found", robots };

  const amount = formatAssetAmount(payment.amount, payment.asset);
  const title = `Pay ${amount} to ${payment.merchant_name}`;
  const description = `${payment.merchant_name} is requesting ${amount} for ${payment.description}. Review and pay securely with your Stellar wallet.`;
  return {
    title,
    description,
    robots,
    openGraph: { title, description, type: "website", siteName: site.name },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function PayPage({ params }: PageProps<"/pay/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Payment params={params} />
    </Suspense>
  );
}

async function Payment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await getPublicPayment(id);
  if (!payment) notFound();
  // Rendered from the server's view of the request, so an expired or paid
  // link never flashes the pay buttons.
  return <Checkout initial={payment} />;
}

/** The brand hero, so the page has its shape before the request loads. */
function Loading() {
  return (
    <div
      className="min-h-dvh bg-canvas"
      aria-busy
      aria-label="Loading payment request"
    >
      <div className="bg-brand px-5 pt-5 pb-64 text-white">
        <div className="mx-auto max-w-3xl">
          <Wordmark className="text-white" />
        </div>
      </div>
      <div className="mx-auto -mt-20 h-72 max-w-md rounded-t-sheet bg-surface sm:rounded-b-sheet" />
    </div>
  );
}
