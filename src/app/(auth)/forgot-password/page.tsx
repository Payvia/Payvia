import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Skeleton } from "@/components/ui/skeleton";
import { features } from "@/lib/features";

// Reached from an email link: nothing here is for search engines.
export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function Page() {
  // These flows belong to the live backend; the mock API has no email.
  if (!features.backend) notFound();
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your account email and we will send you a link to set a new password."
    >
      {/* The form reads the link's token from the URL in the browser. */}
      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
