"use client";

import { toast } from "sonner";

/** Copies text and confirms with a toast. `label` names what was copied. */
export function useCopy() {
  return async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error(`Could not copy ${label}`);
    }
  };
}
