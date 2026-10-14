import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex h-6 w-fit shrink-0 items-center rounded-full bg-brand-soft px-2.5 text-[11px] tracking-[0.04em] text-brand-ink uppercase">
      {children}
    </p>
  );
}
