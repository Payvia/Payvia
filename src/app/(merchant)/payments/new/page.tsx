import type { Metadata } from "next";
import { CreatePayment } from "@/components/merchant/create-payment";
import { PageHeader } from "@/components/merchant/page-header";

// Against the live backend the merchant loads in the browser, so the server
// renders the shell without this page and has nothing here to validate.
export const instant = false;

export const metadata: Metadata = { title: "Create payment request" };

export default function NewPaymentPage() {
  return (
    <>
      <PageHeader title="Create payment request" />
      <CreatePayment />
    </>
  );
}
