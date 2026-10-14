import type { Metadata } from "next";
import { Suspense } from "react";
import { QRView } from "@/components/qr/qr-view";
import { Skeleton } from "@/components/ui/skeleton";

// Against the live backend the merchant loads in the browser, so the server
// renders the shell without this page and has nothing here to validate.
export const instant = false;

export const metadata: Metadata = { title: "QR view" };

export default function QrViewPage({ params }: PageProps<"/qr/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[28rem] rounded-panel" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QRView paymentId={decodeURIComponent(id)} />;
}
