"use client";

import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { duration, ease, stagger } from "@/lib/motion/tokens";

type StaggerProps = {
  children: ReactNode;
  className?: string;
  /** Seconds between children. */
  gap?: number;
  delay?: number;
  /** Animate on mount instead of when scrolled into view. */
  immediate?: boolean;
};

/** Reveals its `StaggerItem` children one after another. */
export function Stagger({
  children,
  className,
  gap = stagger.base,
  delay = 0,
  immediate = false,
}: StaggerProps) {
  return (
    <m.div
      className={className}
      initial="hidden"
      {...(immediate
        ? { animate: "visible" }
        : {
            whileInView: "visible",
            viewport: { once: true, margin: "0px 0px -10% 0px" },
          })}
      variants={{
        visible: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  return (
    <m.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: duration.slow, ease: ease.out },
        },
      }}
    >
      {children}
    </m.div>
  );
}
