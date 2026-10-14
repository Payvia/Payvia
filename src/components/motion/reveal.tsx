"use client";

import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { duration, ease } from "@/lib/motion/tokens";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Distance in px the element rises as it fades in. */
  y?: number;
};

/** Fade and rise once when the element enters the viewport. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: RevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: duration.slow, ease: ease.out, delay }}
    >
      {children}
    </m.div>
  );
}
