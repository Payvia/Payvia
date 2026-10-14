"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { duration, gsapEase } from "./tokens";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);
gsap.defaults({ duration: duration.slow, ease: gsapEase.out });

/** Media queries for gsap.matchMedia(), matching the breakpoints in docs/02-design-system.md. */
export const media = {
  desktop: "(min-width: 1024px)",
  notMobile: "(min-width: 768px)",
  mobile: "(max-width: 767px)",
  motionOk: "(prefers-reduced-motion: no-preference)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
} as const;

export { gsap, ScrollTrigger, SplitText, useGSAP };
