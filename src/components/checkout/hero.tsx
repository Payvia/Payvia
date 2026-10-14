"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/cn";
import { formatAmount } from "@/lib/format";
import { duration, ease } from "@/lib/motion/tokens";
import { Leaves } from "./illustrations";

export type HeroTone = "brand" | "success" | "danger" | "soft";

const tones: Record<
  HeroTone,
  { bg: string; text: string; leaf: string; chip: string }
> = {
  brand: {
    bg: "bg-brand",
    text: "text-white",
    leaf: "text-brand-deep",
    chip: "bg-white/15 text-white",
  },
  success: {
    bg: "bg-success",
    text: "text-[#213d00]",
    leaf: "text-[#a6e600]",
    chip: "bg-[#213d00] text-white",
  },
  danger: {
    bg: "bg-danger",
    text: "text-white",
    leaf: "text-[#e63900]",
    chip: "bg-white/20 text-white",
  },
  soft: {
    bg: "bg-danger-soft",
    text: "text-[#7a1f00]",
    leaf: "text-[#ffd9cc]",
    chip: "bg-white/60 text-danger-ink",
  },
};

type HeroProps = {
  tone: HeroTone;
  chip: ReactNode;
  /** "Amount due", hidden on states where nothing is due. */
  label?: string;
  amount: string;
  asset: string;
  description: string;
  actions?: ReactNode;
  /** Shown at the bottom edge, behind the sheet. */
  illustration?: ReactNode;
};

export function Hero({
  tone,
  chip,
  label,
  amount,
  asset,
  description,
  actions,
  illustration,
}: HeroProps) {
  const { bg, text, leaf, chip: chipClass } = tones[tone];

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden px-5 pt-5 text-center transition-colors duration-500",
        illustration ? "pb-72 md:pb-56" : "pb-28",
        text,
      )}
    >
      {/* Each tone is its own layer. A new one wipes in as a growing circle
          over the old, which stays underneath until it is covered. */}
      <AnimatePresence initial={false}>
        <m.div
          key={tone}
          aria-hidden
          className={cn("absolute inset-0 -z-20", bg)}
          initial={{ clipPath: "circle(0% at 50% 42%)" }}
          animate={{ clipPath: "circle(150% at 50% 42%)" }}
          exit={{ opacity: 1, transition: { duration: duration.hero } }}
          transition={{ duration: duration.hero, ease: ease.inOut }}
        />
      </AnimatePresence>
      <Leaves
        className={cn(
          "top-0 -right-16 -z-10 w-72 transition-colors duration-700 md:right-0 md:w-96",
          leaf,
        )}
      />

      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <Wordmark className="text-current" />
      </header>

      <m.div
        className="mt-10 flex flex-col items-center md:mt-12"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.slow, ease: ease.out }}
      >
        <span
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition-colors duration-500",
            chipClass,
          )}
        >
          {chip}
        </span>
        {label ? <p className="mt-4 text-xs opacity-90">{label}</p> : null}
        <p className="mt-1 flex items-baseline gap-2 font-semibold tracking-[-0.04em]">
          <span className="text-[3.5rem] leading-none md:text-7xl">
            ${formatAmount(amount)}
          </span>
          <span className="text-lg font-normal tracking-normal">{asset}</span>
        </p>
        <p className="mt-2 max-w-xs text-xs opacity-90">{description}</p>
        {actions ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2 print:hidden">
            {actions}
          </div>
        ) : null}
      </m.div>

      <AnimatePresence>
        {illustration ? (
          <m.div
            key="illustration"
            aria-hidden
            className="pointer-events-none absolute right-1/2 bottom-10 -z-10 w-40 translate-x-1/2 md:right-[8%] md:bottom-0 md:w-80 md:translate-x-0"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: duration.slow, ease: ease.out }}
          >
            {illustration}
          </m.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
