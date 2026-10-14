"use client";

import * as m from "motion/react-m";
import { RadioGroup } from "radix-ui";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion/tokens";

export type Segment<T extends string> = {
  value: T;
  label: string;
  /** Second line, as in the expiry control. */
  description?: string;
};

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

/** Single-choice control with a pill that slides to the selected segment. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onValueChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const pillId = useId();

  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      orientation="horizontal"
      className={cn("flex rounded-xl bg-field p-1", className)}
      {...props}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <RadioGroup.Item
            key={segment.value}
            value={segment.value}
            className={cn(
              "relative flex min-h-9 min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-xs transition-colors duration-150",
              selected ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {selected ? (
              <m.span
                layoutId={pillId}
                transition={spring.ui}
                className="absolute inset-0 rounded-lg bg-surface"
              />
            ) : null}
            <span className="relative truncate">{segment.label}</span>
            {segment.description ? (
              <span className="relative truncate text-[11px] text-muted">
                {segment.description}
              </span>
            ) : null}
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
