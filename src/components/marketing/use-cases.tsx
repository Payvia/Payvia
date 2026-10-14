"use client";

import Link from "next/link";
import { useRef } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { SplitHeading } from "@/components/motion/split-heading";
import { buttonClass } from "@/components/ui/button";
import { gsap, media, useGSAP } from "@/lib/motion/gsap";
import { routes } from "@/lib/routes";
import { SectionLabel } from "./section-label";

const cases = [
  {
    title: "Freelancers",
    text: "Send a link for the final payment and see when it's paid.",
  },
  {
    title: "Stores and restaurants",
    text: "Put a QR code at the counter and let customers scan to pay.",
  },
  {
    title: "Events and conferences",
    text: "Collect payments at the door with one scan.",
  },
  {
    title: "Vendors and donations",
    text: "Accept payments or donations from anyone with a Stellar wallet.",
  },
];

export function UseCases() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(media.motionOk, () => {
        const trigger = {
          trigger: "[data-cases]",
          start: "top 82%",
          once: true,
        };
        // Dividers draw first, then each column's text follows its line.
        gsap.from("[data-divider]", {
          scaleX: 0,
          scaleY: 0,
          duration: 1,
          stagger: 0.1,
          ease: "expo.inOut",
          scrollTrigger: trigger,
        });
        gsap.from("[data-case-text]", {
          y: 24,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          delay: 0.25,
          scrollTrigger: trigger,
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="use-cases"
      className="mx-auto max-w-[90rem] scroll-mt-8 px-4 py-16 md:px-10 md:py-24"
    >
      <div className="flex flex-col-reverse gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <SplitHeading className="max-w-xl text-3xl leading-[1.05] tracking-[-0.02em] md:text-5xl">
            Made for anyone who gets paid.
          </SplitHeading>
          <Magnetic className="mt-6">
            <Link
              href={routes.signup}
              className={buttonClass({
                variant: "brand",
                size: "lg",
                pill: true,
              })}
            >
              Get started
            </Link>
          </Magnetic>
        </div>
        <SectionLabel>Use cases</SectionLabel>
      </div>

      <ul
        data-cases
        className="mt-12 grid md:mt-20 md:grid-cols-2 xl:grid-cols-4"
      >
        {cases.map((item) => (
          <li
            key={item.title}
            className="group relative py-6 md:px-6 md:py-2 md:first:pl-0"
          >
            {/* Horizontal rule on mobile, vertical rule between columns on desktop. */}
            <span
              data-divider
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px origin-left bg-line transition-colors duration-300 group-last:hidden group-hover:bg-brand md:inset-x-auto md:inset-y-0 md:right-0 md:h-auto md:w-px md:origin-top"
            />
            <div data-case-text>
              <h3 className="text-lg tracking-tight md:text-xl">
                {item.title}
              </h3>
              <p className="mt-3 max-w-[16rem] text-sm text-muted">
                {item.text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
