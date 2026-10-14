"use client";

import { Check, Copy } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { duration } from "@/lib/motion/tokens";
import { IconButton } from "./icon-button";

type CopyButtonProps = {
  /** The full value to copy, not the truncated one on screen. */
  value: string;
  /** What is being copied, for the label and toast: "payment link". */
  label: string;
  className?: string;
};

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error(`Could not copy ${label}`);
    }
  }

  const Icon = copied ? Check : Copy;

  return (
    <IconButton
      label={copied ? `Copied ${label}` : `Copy ${label}`}
      size="sm"
      onClick={copy}
      className={className}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={copied ? "check" : "copy"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: duration.fast }}
          className="flex"
        >
          <Icon aria-hidden />
        </m.span>
      </AnimatePresence>
    </IconButton>
  );
}
