import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Log in",
  description:
    "Log in to your PayVia merchant account to create payment requests and track payments.",
  path: routes.login,
});

export default function LoginPage() {
  return (
    <AuthCard
      title="Log in to PayVia"
      description="Access your merchant account and payment requests."
    >
      <LoginForm />
    </AuthCard>
  );
}
