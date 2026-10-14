"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/state";
import { api, ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import type { Merchant } from "@/lib/api/schemas";
import { routes } from "@/lib/routes";

const MerchantContext = createContext<Merchant | null>(null);

const signedOut = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

/** Shown when the merchant could not be loaded for a reason other than being signed out. */
function Unavailable({ retry }: { retry: () => void }) {
  async function logout() {
    // Clears the session cookies even if the backend cannot be reached.
    await api.auth.logout().catch(() => undefined);
    window.location.assign(routes.login);
  }
  return (
    <div className="flex flex-1 items-start p-6">
      <ErrorState
        className="max-w-md"
        title="We couldn't load your account"
        description="PayVia is not responding right now. Try again in a moment."
        action={
          <div className="flex gap-2">
            <Button size="sm" onClick={retry}>
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={logout}>
              Log out
            </Button>
          </div>
        }
      />
    </div>
  );
}

/**
 * Loads the signed-in merchant, or takes the one the server already read.
 * Returns the merchant, or what to show in its place. Without a session it
 * sends the visitor to log in.
 */
export function useMerchantQuery(
  initial: Merchant | undefined,
  fallback: ReactNode,
): { merchant: Merchant } | { merchant?: undefined; placeholder: ReactNode } {
  const query = useQuery({
    ...queries.me(),
    initialData: initial,
    retry: (count, error) => !signedOut(error) && count < 1,
  });
  const { data, error, refetch } = query;

  useEffect(() => {
    // Full page load so no cached data or routes outlive the session.
    if (!data && signedOut(error)) window.location.assign(routes.login);
  }, [data, error]);

  if (data) return { merchant: data };
  return {
    placeholder:
      error && !signedOut(error) ? (
        <Unavailable retry={() => void refetch()} />
      ) : (
        fallback
      ),
  };
}

/** Makes the signed-in merchant available to client components. */
export function MerchantProvider({
  merchant,
  fallback = null,
  children,
}: {
  /** Read on the server in mock mode; loaded here against the live backend. */
  merchant?: Merchant;
  /** Shown while the merchant loads. */
  fallback?: ReactNode;
  children: ReactNode;
}) {
  // Seeded from the server when it can be, then kept fresh after profile edits.
  const loaded = useMerchantQuery(merchant, fallback);
  if (!loaded.merchant) return loaded.placeholder;
  return <MerchantContext value={loaded.merchant}>{children}</MerchantContext>;
}

export function useMerchant(): Merchant {
  const merchant = useContext(MerchantContext);
  if (!merchant) {
    throw new Error("useMerchant must be used inside MerchantProvider.");
  }
  return merchant;
}
