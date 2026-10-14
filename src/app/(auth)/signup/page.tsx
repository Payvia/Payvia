import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign up",
  description:
    "Create a PayVia merchant account to share payment links and QR codes and get paid in USDC on Stellar.",
  path: routes.signup,
});

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your PayVia account"
      description="Create payment requests and receive USDC on Stellar Testnet."
    >
      <SignupForm />
    </AuthCard>
  );
}
