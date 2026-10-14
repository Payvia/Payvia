"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useMerchant } from "./merchant-provider";

/**
 * Shown across the merchant app until the email address is verified: the
 * backend refuses to create or email payment links before that.
 */
export function VerifyEmailBanner() {
  const merchant = useMerchant();
  const resend = useMutation({
    mutationFn: api.auth.resendVerification,
    onSuccess: () =>
      toast.success(`Verification email sent to ${merchant.email}`),
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not send the email. Please try again.",
      ),
  });

  if (merchant.email_verified) return null;

  return (
    <Banner
      title="Verify your email address"
      className="mb-6 print:hidden"
      action={
        <Button
          size="sm"
          variant="outline"
          pill
          loading={resend.isPending}
          onClick={() => resend.mutate()}
        >
          Resend email
        </Button>
      }
    >
      We sent a link to {merchant.email}. Open it to start creating payment
      links.
    </Banner>
  );
}
