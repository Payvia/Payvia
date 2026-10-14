import type { Metadata } from "next";
import { Suspense } from "react";
import { QRPrint } from "@/components/qr/qr-view";
import { Skeleton } from "@/components/ui/skeleton";

// Against the live backend the merchant loads in the browser, so the server
// renders the shell without this page and has nothing here to validate.
export const instant = false;

export const metadata: Metadata = { title: "Print QR code" };

export default function QrPrintPage({
  params,
  searchParams,
}: PageProps<"/qr/[id]/print">) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] rounded-panel" />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: Pick<PageProps<"/qr/[id]/print">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <QRPrint
      paymentId={decodeURIComponent(id)}
      autoPrint={query.print === "1"}
    />
  );
}
