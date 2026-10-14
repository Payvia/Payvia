"use client";

import "./globals.css";

// Matches merchant-ui/Error : Full screen. Rendered when the root layout
// itself fails, so it cannot rely on the app's fonts or providers.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6">
            <h1 className="text-lg">Something went wrong</h1>
            <p className="mt-1 text-sm text-muted">
              We couldn&apos;t load this page. Please try again.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              className="mt-5 rounded-lg bg-ink px-4 py-2 text-sm text-white"
            >
              Retry
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
