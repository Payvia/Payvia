import type { Metadata } from "next";
import { PageHeader } from "@/components/merchant/page-header";
import { QRList } from "@/components/qr/qr-list";

// Against the live backend the merchant loads in the browser, so the server
// renders the shell without this page and has nothing here to validate.
export const instant = false;

export const metadata: Metadata = { title: "QR codes" };

export default function QrCodesPage() {
  return (
    <>
      <PageHeader title="QR codes" />
      <QRList />
    </>
  );
}
