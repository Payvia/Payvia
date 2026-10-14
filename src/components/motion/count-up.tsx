"use client";

import {
  animate,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";
import { formatAmount } from "@/lib/format";
import { ease } from "@/lib/motion/tokens";

type CountUpProps = {
  /** Decimal string. The exact formatted value is what ends up on screen. */
  value: string;
  prefix?: string;
  className?: string;
  /** Seconds. */
  duration?: number;
};

/**
 * Counts up to an amount once, when first seen. The animation is cosmetic and
 * runs on floats; the final text is formatted from the exact string.
 */
export function CountUp({
  value,
  prefix = "",
  className,
  duration = 1.2,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);
  const exact = `${prefix}${formatAmount(value)}`;

  const progress = useMotionValue(0);
  const text = useTransform(
    progress,
    (current) => `${prefix}${formatAmount(current.toFixed(2))}`,
  );

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const controls = animate(progress, Number(value), {
      duration,
      ease: ease.out,
      onComplete: () => setDone(true),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, value, duration, progress]);

  const settled = done || reduceMotion;

  return (
    <span ref={ref} className={className}>
      {/* Screen readers get the real value, not the ticking one. */}
      <span className="sr-only">{exact}</span>
      <span aria-hidden className="tabular-nums">
        {settled ? exact : <m.span>{text}</m.span>}
      </span>
    </span>
  );
}
