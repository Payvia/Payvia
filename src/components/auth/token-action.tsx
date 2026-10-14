"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import { routes } from "@/lib/routes";

const copy = {
  verify: {
    working: "Verifying your email address…",
    done: "Your email address is verified. You can now create payment links.",
    next: { href: routes.dashboard, label: "Continue to PayVia" },
    stale:
      "This link has expired or was already used. Log in and choose Resend email to get a new one.",
    missing:
      "Open the link in the email we sent you. If it has expired, log in and choose Resend email.",
  },
  "email-change": {
    working: "Confirming your new email address…",
    done: "Your email address has been changed. Log in with the new address to continue.",
    next: { href: routes.login, label: "Log in" },
    stale:
      "This link has expired or was already used. Start the change again from Settings.",
    missing:
      "Open the link in the email we sent to your new address. If it has expired, start the change again from Settings.",
  },
} as const;

/**
 * The page an email link lands on: it hands the link's one-time token to the
 * backend and reports what happened.
 */
export function TokenAction({ kind }: { kind: keyof typeof copy }) {
  const token = useSearchParams().get("token");
  const queryClient = useQueryClient();
  const text = copy[kind];

  // A query, not an effect: the token works once, and a query is sent once
  // however often the component mounts.
  const { isSuccess, error } = useQuery({
    queryKey: ["email-link", kind, token],
    enabled: Boolean(token),
    queryFn: async () => {
      await (kind === "verify"
        ? api.auth.verifyEmail(token!)
        : api.auth.confirmEmailChange(token!));
      return true;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (isSuccess) {
      void queryClient.invalidateQueries({ queryKey: queries.me().queryKey });
    }
  }, [isSuccess, queryClient]);

  if (!token) return <Banner>{text.missing}</Banner>;

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="success">{text.done}</Banner>
        <Button asChild size="lg">
          {/* A full load, so the app picks up the changed account. */}
          <a href={text.next.href}>{text.next.label}</a>
        </Button>
      </div>
    );
  }

  if (error) {
    const stale = error instanceof ApiError && error.code === "token_invalid";
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="danger">
          {stale
            ? text.stale
            : error instanceof ApiError
              ? error.message
              : "Something went wrong. Please try again."}
        </Banner>
        <Button asChild size="lg" variant="outline">
          <Link href={routes.login}>Go to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col gap-3">
      <p className="text-xs text-muted">{text.working}</p>
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
