import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DetailList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("divide-y divide-line", className)}>{children}</dl>;
}

/** Label and value: side by side on desktop, stacked on mobile. */
export function DetailRow({
  label,
  mono = false,
  children,
}: {
  label: string;
  /** Monospace value, for links, wallets and hashes. */
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2.5 md:flex-row md:items-center md:justify-between md:gap-6">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd
        className={cn(
          "flex min-w-0 items-center gap-1.5 text-[13px] md:justify-end md:text-right",
          mono && "font-mono text-xs",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
