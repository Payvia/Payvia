"use client";

import { useEffect, useEffectEvent, useRef } from "react";

// Cloudflare Turnstile: the "are you a person" check on sign-up. The widget
// hands over a token, which the backend verifies with Cloudflare. A token
// works once and lasts about five minutes.

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "flexible" | "compact";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => boolean;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile did not start."));
    script.onerror = () => {
      script.remove();
      reject(new Error("Turnstile could not be loaded."));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    // Let the next visit to the form try again.
    loading = null;
    throw error;
  });
  return loading;
}

export function Turnstile({
  siteKey,
  round,
  onToken,
  onError,
}: {
  siteKey: string;
  /** Raise it to discard the token and run the check again. */
  round: number;
  /** A fresh token, or null once it has expired. */
  onToken: (token: string | null) => void;
  /** The check could not load or run. */
  onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string>(undefined);
  const token = useEffectEvent(onToken);
  const failed = useEffectEvent(onError);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return;
        widget.current = api.render(container.current, {
          sitekey: siteKey,
          theme: "light",
          size: "flexible",
          callback: (value) => token(value),
          "expired-callback": () => token(null),
          "error-callback": () => {
            token(null);
            failed();
            // Handled here: stops Turnstile logging it as uncaught.
            return true;
          },
        });
      })
      .catch(() => {
        if (!cancelled) failed();
      });
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [siteKey]);

  useEffect(() => {
    if (round > 0 && widget.current) window.turnstile?.reset(widget.current);
  }, [round]);

  // Reserves the widget's height so the form does not jump when it appears.
  return <div ref={container} className="min-h-[65px]" />;
}
