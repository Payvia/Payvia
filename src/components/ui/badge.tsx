import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-field text-ink",
  info: "bg-info-soft text-info-ink",
  brand: "bg-brand-soft text-brand-ink",
  danger: "bg-danger-soft text-danger-ink",
  success: "bg-success text-ink",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
