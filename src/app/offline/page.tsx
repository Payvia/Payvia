import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { OfflineRetry } from "@/components/pwa/offline-retry";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Offline", robots: noIndex };

// Stored by the service worker and shown when a page cannot be loaded.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6">
        <span className="flex size-9 items-center justify-center rounded-full bg-field">
          <WifiOff className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="mt-4 text-lg">You&apos;re offline</h1>
        <p className="mt-1 text-sm text-muted">
          PayVia needs a connection to load payment requests and confirm
          payments on Stellar. This page reloads when you are back online.
        </p>
        <OfflineRetry />
      </div>
    </main>
  );
}
