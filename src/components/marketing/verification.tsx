"use client";

import { Clock, TriangleAlert } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { ClockIllustration } from "@/components/checkout/illustrations";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { buttonClass } from "@/components/ui/button";
import { gsap, media, useGSAP } from "@/lib/motion/gsap";
import { routes } from "@/lib/routes";
import heroLake from "../../../public/images/hero-lake.jpg";
import tree from "../../../public/images/tree.jpg";

/** A product screen sitting on a strip of photograph, as in the designs. */
function Frame({
  photo,
  children,
  className,
}: {
  photo: StaticImageData;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className ?? ""}`}>
      <Image
        src={photo}
        alt=""
        fill
        placeholder="blur"
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-y-0 right-0 left-[10%] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ExpiredScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-danger-soft text-[#7a1f00]">
      <span className="flex h-7 items-center gap-1.5 rounded-full bg-white/60 px-3 text-xs text-danger-ink">
        <TriangleAlert className="size-3.5" />
        Link Expired
      </span>
      <p className="mt-3 text-5xl font-semibold tracking-[-0.04em]">$150.00</p>
      <p className="mt-2 text-xs">Website Design, Final Payment</p>
    </div>
  );
}

function ProcessingScreen() {
  return (
    <div className="relative h-full bg-brand">
      <ClockIllustration className="absolute -top-28 right-[-12%] w-[26rem]" />
      <div className="absolute inset-x-0 top-36 bottom-0 rounded-tl-sheet bg-surface p-8 md:p-10">
        <span className="flex size-12 items-center justify-center rounded-full bg-field">
          <Clock className="size-5" strokeWidth={1.75} />
        </span>
        <p className="mt-6 max-w-sm text-xl leading-snug md:text-2xl">
          Your payment is being confirmed on Stellar.
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-brand-soft">
          <div data-fill className="h-full origin-left rounded-full bg-brand" />
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted">Stellar confirmation</span>
          <span>Processing</span>
        </div>
      </div>
    </div>
  );
}

function PaidScreen() {
  return (
    <div className="h-full bg-surface">
      <p className="bg-canvas px-8 py-4 text-base font-medium">05:31</p>
      <div className="p-8">
        <p className="text-2xl tracking-tight">PayVia</p>
        <p className="mt-6 text-lg">Payments details</p>
        <div className="mt-4 rounded-panel border border-line p-5">
          <div className="rounded-xl bg-info-soft p-4 text-info-ink">
            <p className="text-sm">Paid</p>
            <p className="text-xs">Payment received successfully.</p>
          </div>
          <p className="mt-4 text-sm">Website Design</p>
          <p className="text-xs text-muted">INV-00124 · Created Oct 8, 2026</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            150.00 USDC
          </p>
        </div>
      </div>
    </div>
  );
}

export function Verification() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Desktop: the right-hand window is a fixed height and its stack of
      // screens scrolls past inside it (expired → confirming → paid) as the
      // section crosses the viewport.
      mm.add(`${media.desktop} and ${media.motionOk}`, () => {
        const stack = root.current?.querySelector<HTMLElement>("[data-stack]");
        const view = root.current?.querySelector<HTMLElement>("[data-window]");
        if (!stack || !view) return;

        gsap.fromTo(
          stack,
          { y: 0 },
          {
            y: () => -(stack.scrollHeight - view.clientHeight),
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top 70%",
              end: "bottom 30%",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      mm.add(media.motionOk, () => {
        // The confirmation bar fills while its card is on screen.
        gsap.fromTo(
          "[data-fill]",
          { scaleX: 0.08 },
          {
            scaleX: 0.92,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-processing]",
              start: "top 85%",
              end: "bottom 35%",
              scrub: 0.6,
            },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="verification"
      className="scroll-mt-8 px-3 py-10 md:px-5 md:py-16"
    >
      <div className="mx-auto grid max-w-[90rem] gap-10 overflow-hidden rounded-sheet bg-canvas p-6 md:p-12 lg:grid-cols-[1fr_minmax(0,34rem)] lg:gap-16 lg:py-0 lg:pr-8">
        <div className="lg:py-16">
          <SplitHeading className="max-w-2xl text-3xl leading-[1.05] tracking-[-0.02em] md:text-5xl">
            A payment is marked paid only after Stellar confirms it.
          </SplitHeading>
          <Reveal delay={0.15}>
            <p className="mt-5 max-w-md text-sm text-muted md:text-base">
              PayVia checks every payment on-chain: the right amount, the right
              asset, the right recipient and the right request. Only then does
              your dashboard change to Paid.
            </p>
            <Link
              href={routes.signup}
              className={buttonClass({
                variant: "brand",
                size: "lg",
                pill: true,
                className: "mt-8",
              })}
            >
              Get started
            </Link>
          </Reveal>
        </div>

        <div
          data-window
          aria-hidden
          className="lg:h-[46rem] lg:overflow-hidden"
        >
          <div data-stack className="flex flex-col gap-5 will-change-transform">
            <Frame photo={tree} className="h-72">
              <ExpiredScreen />
            </Frame>
            <div data-processing>
              <Frame photo={tree} className="h-[31rem]">
                <ProcessingScreen />
              </Frame>
            </div>
            <Frame photo={heroLake} className="h-[30rem]">
              <div className="h-full pt-10">
                <PaidScreen />
              </div>
            </Frame>
          </div>
        </div>
      </div>
    </section>
  );
}
