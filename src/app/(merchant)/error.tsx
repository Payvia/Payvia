"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/state";

// merchant-ui/Error : App shell — the shell stays, the content area recovers.
export default function MerchantError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl">Error loading</h1>
      <ErrorState
        className="max-w-md"
        title="Something went wrong"
        description="We couldn't load this page. Please try again."
        action={
          <Button size="sm" onClick={() => retry()}>
            Retry
          </Button>
        }
      />
    </div>
  );
}
