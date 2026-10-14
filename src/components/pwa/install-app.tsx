"use client";

import { X } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  dismissInstall,
  promptInstall,
  useInstallDismissed,
  useInstallState,
} from "@/lib/pwa/install";

/**
 * Offers to install PayVia as an app. Renders nothing when the browser cannot
 * install it or it is already installed.
 */
export function InstallApp({
  dismissible = false,
  className,
}: {
  /** Adds a close button, and stays hidden once it has been used. */
  dismissible?: boolean;
  className?: string;
}) {
  const state = useInstallState();
  const dismissed = useInstallDismissed();

  if (state === "unavailable" || (dismissible && dismissed)) return null;

  return (
    <Banner
      title="Install PayVia"
      className={className}
      action={
        <div className="flex shrink-0 items-center gap-1">
          {state === "prompt" ? (
            <Button
              size="sm"
              variant="outline"
              pill
              onClick={() => void promptInstall()}
            >
              Install
            </Button>
          ) : null}
          {dismissible ? (
            <IconButton
              label="Dismiss"
              size="sm"
              className="hover:bg-white/60"
              onClick={dismissInstall}
            >
              <X aria-hidden />
            </IconButton>
          ) : null}
        </div>
      }
    >
      {state === "ios"
        ? "Tap Share, then Add to Home Screen to open PayVia like an app."
        : "Add PayVia to your home screen to create and track payment requests faster."}
    </Banner>
  );
}
