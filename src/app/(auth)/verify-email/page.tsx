import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { TokenAction } from "@/components/auth/token-action";
import { Skeleton } from "@/components/ui/skeleton";
import { features } from "@/lib/features";

// Reached from an email link: nothing here is for search engines.
export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

export default function Page() {
  // These flows belong to the live backend; the mock API has no email.
  if (!features.backend) notFound();
  return (
    <AuthCard
      title="Verify your email"
      description="Confirming the address on your PayVia account."
    >
      {/* The form reads the link's token from the URL in the browser. */}
      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        <TokenAction kind="verify" />
      </Suspense>
    </AuthCard>
  );
}
