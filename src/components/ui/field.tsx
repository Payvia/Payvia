"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { duration, ease } from "@/lib/motion/tokens";

export type FieldControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
};

type FieldProps = {
  label: string;
  /** Helper text shown under the control. */
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  /** Receives the id and aria attributes to spread onto the control. */
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-xs">
        {label}
        {optional ? " (optional)" : null}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      <AnimatePresence initial={false}>
        {error ? (
          <m.p
            key="error"
            id={errorId}
            role="alert"
            className="overflow-hidden text-xs text-danger-ink"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: duration.base, ease: ease.out }}
          >
            {error}
          </m.p>
        ) : null}
      </AnimatePresence>
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
