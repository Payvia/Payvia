"use client";

import { useRef, type ReactNode } from "react";
import { gsap, media, useGSAP } from "@/lib/motion/gsap";

type ParallaxProps = {
  children: ReactNode;
  className?: string;
  /** Vertical travel in px across the element's pass through the viewport.
   * Negative moves up (faster than the page), positive moves down (slower). */
  y?: number;
  /** Degrees of rotation added over the same distance. */
  rotate?: number;
};

/** Moves its content against the scroll. Desktop and motion-safe only. */
export function Parallax({
  children,
  className,
  y = -60,
  rotate = 0,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${media.notMobile} and ${media.motionOk}`, () => {
        gsap.fromTo(
          ref.current,
          { y: -y / 2, rotate: -rotate / 2 },
          {
            y: y / 2,
            rotate: rotate / 2,
            ease: "none",
            scrollTrigger: {
              trigger: ref.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
