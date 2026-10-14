"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { Button, type ButtonProps } from "./button";

/**
 * Submit button that stays disabled until the page is interactive. A tap
 * before then would submit the raw HTML form, bypassing validation and losing
 * what was typed.
 */
export function SubmitButton({
  disabled,
  ...props
}: Omit<ButtonProps, "type">) {
  const hydrated = useHydrated();
  return (
    <Button
      type="submit"
      disabled={disabled || !hydrated}
      // Lets tests tell "not interactive yet" from "disabled by the form".
      data-ready={hydrated || undefined}
      {...props}
    />
  );
}
