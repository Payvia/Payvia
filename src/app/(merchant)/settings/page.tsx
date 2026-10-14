import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/merchant/page-header";
import { Settings } from "@/components/merchant/settings";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

// Against the live backend the merchant loads in the browser, so the server
// renders the shell without this page and has nothing here to validate.
export const instant = false;

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        action={
          <Button asChild>
            <Link href={routes.newPayment}>Create request</Link>
          </Button>
        }
      />
      <Settings />
    </>
  );
}
