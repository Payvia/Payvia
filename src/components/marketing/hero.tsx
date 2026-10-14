"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { CountUp } from "@/components/motion/count-up";
import { buttonClass } from "@/components/ui/button";
import { gsap, media, useGSAP } from "@/lib/motion/gsap";
import { gsapEase } from "@/lib/motion/tokens";
import { routes } from "@/lib/routes";
import heroLake from "../../../public/images/hero-lake.jpg";
import { CheckoutMock, DashboardMock } from "./mockups";
import { Nav } from "./nav";

const headline = {
  desktop: ["Get paid as easily", "as sending a link."],
  mobile: ["Get paid as", "easily as sending", "a link."],
};

function HeadlineLines({
  lines,
  className,
}: {
  lines: string[];
  className?: string;
}) {
  return (
    <span aria-hidden className={className}>
      {lines.map((line, index) => (
        <span key={line} className="block overflow-hidden pb-[0.08em]">
          <span
            className="block animate-rise motion-reduce:animate-none"
            style={{ animationDelay: `${0.15 + index * 0.09}s` }}
          >
            {line}
          </span>
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(media.motionOk, () => {
        // Entrance: the photograph settles, then the phones rise into place.
        // The headline is animated in CSS so it never waits for JavaScript.
        gsap
          .timeline({ defaults: { ease: gsapEase.out } })
          .from("[data-hero-photo]", { scale: 1.18, duration: 1.8 }, 0)
          .from(
            "[data-hero-phone]",
            { yPercent: 55, opacity: 0, duration: 1.3, stagger: 0.12 },
            0.35,
          );
      });

      mm.add(`${media.notMobile} and ${media.motionOk}`, () => {
        // Scroll: the photo lags behind the page, the phones run ahead of it
        // and tilt toward flat, and the whole frame eases back.
        const scroll = {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        };
        gsap.to("[data-hero-photo-wrap]", {
          yPercent: 12,
          ease: "none",
          scrollTrigger: scroll,
        });
        gsap.to("[data-hero-phones]", {
          yPercent: -14,
          rotate: 3,
          ease: "none",
          scrollTrigger: scroll,
        });
        gsap.to("[data-hero-frame]", {
          scale: 0.97,
          ease: "none",
          scrollTrigger: scroll,
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="p-3 md:p-5">
      <div
        data-hero-frame
        className="relative isolate flex min-h-[46rem] flex-col overflow-hidden rounded-sheet p-6 md:min-h-[min(52rem,calc(100dvh-2.5rem))] md:p-12 lg:px-16"
      >
        <div
          data-hero-photo-wrap
          className="absolute inset-0 -z-20 will-change-transform"
        >
          <Image
            data-hero-photo
            src={heroLake}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/45 via-black/20 to-black/10" />

        <Nav />

        <div className="mt-16 max-w-2xl text-white md:mt-24">
          {/* Line breaks are set by hand so each line can rise from its own
              mask; the full sentence is the heading's accessible name. */}
          <h1
            aria-label={headline.desktop.join(" ")}
            className="text-[2.75rem] leading-[1.02] tracking-[-0.03em] md:text-7xl"
          >
            <HeadlineLines lines={headline.mobile} className="md:hidden" />
            <HeadlineLines
              lines={headline.desktop}
              className="hidden md:block"
            />
          </h1>
          <p
            className="mt-5 max-w-xl animate-fade-up text-sm text-white/90 motion-reduce:animate-none md:text-base"
            style={{ animationDelay: "0.45s" }}
          >
            Create a payment request, share it anywhere, and let customers pay
            with Stellar. No website, no integration, no blockchain knowledge
            needed.
          </p>
          <div
            className="mt-8 flex animate-fade-up flex-col gap-2 motion-reduce:animate-none sm:flex-row"
            style={{ animationDelay: "0.55s" }}
          >
            <Link
              href="#how-it-works"
              className={buttonClass({
                variant: "brand",
                size: "lg",
                pill: true,
              })}
            >
              See how it works
            </Link>
            <Link
              href={routes.signup}
              className={buttonClass({
                variant: "brand-soft",
                size: "lg",
                pill: true,
              })}
            >
              Get started
            </Link>
          </div>
        </div>

        <div
          data-hero-phones
          className="pointer-events-none mt-12 flex flex-1 items-end justify-start gap-4 will-change-transform md:absolute md:right-0 md:bottom-0 md:mt-0 md:translate-x-[18%] md:justify-end lg:translate-x-[8%]"
        >
          <div
            data-hero-phone
            className="origin-bottom translate-y-6 -rotate-6"
          >
            <div className="animate-float motion-reduce:animate-none">
              <DashboardMock
                appBar={false}
                className="h-[24rem] md:h-[27rem]"
                total={<CountUp value="4250" prefix="$" duration={1.6} />}
              />
            </div>
          </div>
          <div
            data-hero-phone
            className="origin-bottom translate-y-16 rotate-6"
          >
            <div className="animate-float [animation-delay:-3s] motion-reduce:animate-none">
              <CheckoutMock className="h-[20rem] md:h-[23rem]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
