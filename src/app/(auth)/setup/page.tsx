import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadedSetupForm, SetupForm } from "@/components/auth/setup-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getMerchant } from "@/lib/api/server";
import { features } from "@/lib/features";
import { routes } from "@/lib/routes";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Merchant setup", robots: noIndex };

export default function SetupPage() {
  return (
    <Suspense fallback={loading}>
      <Setup />
    </Suspense>
  );
}

const loading = <Skeleton className="h-[32rem] w-full rounded-panel" />;

async function Setup() {
  if (!features.serverSession) return <LoadedSetupForm fallback={loading} />;
  const merchant = await getMerchant();
  if (!merchant) redirect(routes.login);
  return <SetupForm merchant={merchant} />;
}
