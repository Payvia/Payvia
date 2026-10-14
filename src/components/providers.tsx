"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { domMax, LazyMotion, MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { OfflineNotice } from "@/components/pwa/offline-notice";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Features are loaded up front, not lazily: a late update from this
          provider reaches Suspense boundaries that are still streaming and
          makes React throw away their server HTML and render them again.
          domMax (not domAnimation) because layout animations are used. */}
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster />
          <OfflineNotice />
          <ServiceWorker />
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
