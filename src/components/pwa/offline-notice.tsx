"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

const OFFLINE_TOAST = "pwa-offline";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Keeps a notice on screen for as long as the device has no connection. */
export function OfflineNotice() {
  const online = useOnline();

  useEffect(() => {
    if (online) return;
    toast("You're offline. Payments need a connection.", {
      id: OFFLINE_TOAST,
      duration: Infinity,
    });
    return () => {
      toast.dismiss(OFFLINE_TOAST);
    };
  }, [online]);

  return null;
}
