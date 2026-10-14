import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { MerchantProvider } from "@/components/merchant/merchant-provider";
import { BottomTabs, SidebarNav } from "@/components/merchant/nav-links";
import { TopBar } from "@/components/merchant/top-bar";
import { VerifyEmailBanner } from "@/components/merchant/verify-email-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/wordmark";
import { getMerchant } from "@/lib/api/server";
import { features } from "@/lib/features";
import { routes } from "@/lib/routes";
import { noIndex } from "@/lib/seo";

// Everything in the merchant app is private to the signed-in merchant.
export const metadata: Metadata = { robots: noIndex };

export default function MerchantLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line p-3 md:flex print:hidden">
        <Wordmark href={routes.dashboard} className="px-2.5 pt-2" />
        <Suspense fallback={null}>
          <SidebarNav />
        </Suspense>
      </aside>
      {/* The session is read per request, so everything that depends on it
          streams in behind this boundary while the shell above is static. */}
      <Suspense fallback={<ContentSkeleton />}>
        <Authenticated>{children}</Authenticated>
      </Suspense>
      <Suspense fallback={null}>
        <BottomTabs />
      </Suspense>
    </div>
  );
}

async function Authenticated({ children }: { children: ReactNode }) {
  let merchant;
  if (features.serverSession) {
    merchant = await getMerchant();
    if (!merchant) redirect(routes.login);
    if (!merchant.business_name) redirect(routes.setup);
  }

  return (
    <MerchantProvider merchant={merchant} fallback={<ContentSkeleton />}>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="w-full max-w-[60rem] flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-12 print:max-w-none print:p-0">
          <VerifyEmailBanner />
          {children}
        </main>
      </div>
    </MerchantProvider>
  );
}

function ContentSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="h-14 border-b border-line md:h-16" />
      <div className="flex max-w-[60rem] flex-col gap-4 px-4 pt-6 md:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
