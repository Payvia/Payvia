import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--color-field)_25%,var(--color-canvas)_50%,var(--color-field)_75%)] bg-[length:200%_100%] motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
