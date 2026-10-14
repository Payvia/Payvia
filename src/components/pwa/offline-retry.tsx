"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * The offline page is shown in place of whichever page failed to load, so
 * reloading retries that page.
 */
export function OfflineRetry() {
  useEffect(() => {
    const reload = () => window.location.reload();
    window.addEventListener("online", reload);
    return () => window.removeEventListener("online", reload);
  }, []);

  return (
    <Button className="mt-5" onClick={() => window.location.reload()}>
      Try again
    </Button>
  );
}
