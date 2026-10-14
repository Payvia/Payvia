"use client";

import { useRef, type ReactNode } from "react";
import { gsap, media, SplitText, useGSAP } from "@/lib/motion/gsap";
import { duration, gsapEase, stagger } from "@/lib/motion/tokens";

type SplitHeadingProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  /** Play on mount (hero) instead of when scrolled into view. */
  immediate?: boolean;
};

/**
 * Heading whose lines slide up from behind a mask, one after another.
 * Re-splits when the text reflows, and renders plain text for reduced motion
 * or when JavaScript has not loaded.
 */
export function SplitHeading({
  children,
  as: Tag = "h2",
  className,
  delay = 0,
  immediate = false,
}: SplitHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element) return;

      const mm = gsap.matchMedia();
      mm.add(media.motionOk, () => {
        let split: SplitText | undefined;
        let cancelled = false;

        // Hidden from here (not in the HTML) so the text is readable before
        // JavaScript loads, and never flashes unsplit once it has.
        gsap.set(element, { visibility: "hidden" });

        // Line breaks are only correct once the web font has loaded.
        document.fonts.ready.then(() => {
          if (cancelled) return;
          split = SplitText.create(element, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 110,
                duration: duration.hero,
                ease: gsapEase.out,
                stagger: stagger.base,
                delay,
                scrollTrigger: immediate
                  ? undefined
                  : { trigger: element, start: "top 85%", once: true },
              }),
          });
          gsap.set(element, { visibility: "visible" });
        });

        return () => {
          cancelled = true;
          split?.revert();
          gsap.set(element, { visibility: "visible" });
        };
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
