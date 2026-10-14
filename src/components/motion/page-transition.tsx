"use client";

import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { ease } from "@/lib/motion/tokens";

/** Short fade and rise for route content. Use from a `template.tsx`. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: ease.out }}
    >
      {children}
    </m.div>
  );
}
