"use client";

import { useMotionValue, useSpring } from "motion/react";
import * as m from "motion/react-m";
import type { PointerEvent, ReactNode } from "react";
import { spring } from "@/lib/motion/tokens";

/** Lets its child drift a little toward the cursor. Mouse pointers only. */
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const x = useSpring(useMotionValue(0), spring.soft);
  const y = useSpring(useMotionValue(0), spring.soft);

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (box.left + box.width / 2)) * strength);
    y.set((event.clientY - (box.top + box.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <m.div
      className={className}
      style={{ x, y, display: "inline-block" }}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </m.div>
  );
}
