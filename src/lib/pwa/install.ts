import { useSyncExternalStore } from "react";

// Chromium fires `beforeinstallprompt` once, soon after load, and only lets
// the page open the install dialog from that event. It is captured here at
// module scope so it is not missed by components that mount later.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * prompt: the browser can show its install dialog.
 * ios: no dialog exists; the app is added from the Share menu.
 */
export type InstallState = "unavailable" | "prompt" | "ios";

const DISMISSED_KEY = "payvia:install-dismissed";

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Hold the event so the app can offer installing in its own UI.
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  );
}

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac.
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function installState(): InstallState {
  if (isStandalone()) return "unavailable";
  if (deferred) return "prompt";
  return isIos() ? "ios" : "unavailable";
}

function isDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function useInstallState() {
  return useSyncExternalStore<InstallState>(
    subscribe,
    installState,
    () => "unavailable",
  );
}

/** Whether the merchant has closed the install suggestion on this device. */
export function useInstallDismissed() {
  return useSyncExternalStore(subscribe, isDismissed, () => true);
}

export function dismissInstall() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage can be blocked. The suggestion then returns on the next visit.
  }
  emit();
}

/** Opens the browser's install dialog. Resolves true if the app was installed. */
export async function promptInstall() {
  const event = deferred;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event can only be used once.
  deferred = null;
  emit();
  return outcome === "accepted";
}
