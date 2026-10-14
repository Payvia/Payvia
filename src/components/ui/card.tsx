import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-panel border border-line bg-surface", className)}
      {...props}
    />
  );
}

/** Small uppercase label above a card or section. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[11px] tracking-[0.04em] text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}
