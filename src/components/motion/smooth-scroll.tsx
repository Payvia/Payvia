"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef, type ReactNode } from "react";
import { gsap, media, ScrollTrigger } from "@/lib/motion/gsap";

/**
 * Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger and the
 * scroll position stay on the same frame. Landing page only; off for
 * reduced motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    const lenis = lenisRef.current?.lenis;
    lenis?.on("scroll", ScrollTrigger.update);

    const reduce = window.matchMedia(media.reduceMotion);
    const sync = () => (reduce.matches ? lenis?.destroy() : undefined);
    sync();

    return () => {
      gsap.ticker.remove(update);
      lenis?.off("scroll", ScrollTrigger.update);
    };
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, lerp: 0.1, anchors: true }}
    >
      {children}
    </ReactLenis>
  );
}
