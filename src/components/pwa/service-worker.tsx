"use client";

import { useEffect } from "react";
import { toast } from "sonner";
// Imported here so the install prompt is captured as soon as the app loads.
import "@/lib/pwa/install";

const UPDATE_TOAST = "pwa-update";

/**
 * Registers the service worker and offers a reload when a new version has
 * been downloaded. Production only: in development it would serve stale
 * chunks and fight hot reloading.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let reloadRequested = false;

    const offerUpdate = (worker: ServiceWorker) => {
      toast("A new version of PayVia is ready", {
        id: UPDATE_TOAST,
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => {
            reloadRequested = true;
            worker.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    };

    // Other tabs pick up the new worker without reloading; only the tab that
    // asked for the update does.
    const onControllerChange = () => {
      if (reloadRequested) window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        // With no controller this is the first install, not an update.
        const isUpdate = () => navigator.serviceWorker.controller !== null;

        if (registration.waiting && isUpdate()) {
          offerUpdate(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && isUpdate()) offerUpdate(worker);
          });
        });
      })
      .catch(() => {
        // The app works without it. Nothing to tell the user.
      });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
