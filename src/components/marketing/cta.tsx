"use client";

import Link from "next/link";
import { useRef } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { SplitHeading } from "@/components/motion/split-heading";
import { buttonClass } from "@/components/ui/button";
import { gsap, media, useGSAP } from "@/lib/motion/gsap";
import { routes } from "@/lib/routes";
import { CheckoutMock, DashboardMock } from "./mockups";

export function Cta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(media.motionOk, () => {
        const enter = {
          trigger: root.current,
          start: "top 90%",
          end: "top 35%",
          scrub: 0.6,
        };
        // The band grows from an inset card to its full width as it arrives.
        gsap.fromTo(
          "[data-band]",
          { scale: 0.92, borderRadius: "3rem" },
          {
            scale: 1,
            borderRadius: "2rem",
            ease: "none",
            scrollTrigger: enter,
          },
        );
        gsap.fromTo(
          "[data-cta-phones]",
          { xPercent: 22, rotate: 4 },
          { xPercent: 0, rotate: 0, ease: "none", scrollTrigger: enter },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="px-3 py-6 md:px-5">
      <div
        data-band
        className="relative mx-auto flex min-h-[26rem] max-w-[90rem] flex-col overflow-hidden bg-brand p-8 text-white will-change-transform md:min-h-[25rem] md:p-14"
        style={{ borderRadius: "2rem" }}
      >
        <div className="relative z-10 max-w-md">
          <SplitHeading className="text-3xl leading-[1.02] tracking-[-0.02em] md:text-5xl">
            Create your first payment link.
          </SplitHeading>
          <p className="mt-4 text-sm text-white/90 md:text-base">
            It takes a few seconds to set up your first request.
          </p>
          <Magnetic className="mt-7">
            <Link
              href={routes.signup}
              className={buttonClass({ size: "lg", pill: true })}
            >
              Get started
            </Link>
          </Magnetic>
        </div>
        <div
          data-cta-phones
          className="pointer-events-none mt-10 flex flex-1 items-end gap-4 will-change-transform md:absolute md:right-0 md:bottom-0 md:mt-0 md:translate-x-[10%]"
        >
          <div className="origin-bottom translate-y-4 -rotate-3">
            <DashboardMock className="h-[17rem] md:h-[21rem]" />
          </div>
          <div className="origin-bottom translate-y-10 rotate-3">
            <CheckoutMock className="h-[14rem] shadow-black/40 md:h-[18rem]" />
          </div>
        </div>
      </div>
    </section>
  );
}
