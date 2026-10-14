"use client";

import { Check } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion/tokens";

type FormStepProps = {
  number: number;
  title: string;
  description: string;
  /** Turns the number into a check mark. */
  complete?: boolean;
  /** Hide the connector line under the last step. */
  last?: boolean;
  children: ReactNode;
};

/** One numbered step of a form, joined to the next by a dashed line. */
export function FormStep({
  number,
  title,
  description,
  complete = false,
  last = false,
  children,
}: FormStepProps) {
  return (
    <section className="relative flex gap-3">
      {last ? null : (
        <span
          aria-hidden
          className="absolute top-7 bottom-0 left-[10px] border-l border-dashed border-line"
        />
      )}
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 flex size-[21px] shrink-0 items-center justify-center rounded-full text-[10px] transition-colors duration-300",
          complete
            ? "bg-ink text-white"
            : "border border-line bg-surface text-muted",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={complete ? "check" : "number"}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={spring.ui}
            className="flex"
          >
            {complete ? <Check className="size-3" strokeWidth={3} /> : number}
          </m.span>
        </AnimatePresence>
      </span>
      <div className={cn("min-w-0 flex-1", !last && "pb-6")}>
        <h3 className="text-sm">
          <span className="sr-only">
            Step {number}
            {complete ? " (complete)" : ""}:{" "}
          </span>
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
        <div className="mt-3 flex flex-col gap-4">{children}</div>
      </div>
    </section>
  );
}
