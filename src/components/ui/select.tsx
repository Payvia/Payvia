"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as RadixSelect } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { controlClass } from "./input";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = Omit<ComponentProps<typeof RadixSelect.Root>, "children"> & {
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

export function Select({
  options,
  placeholder,
  className,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: SelectProps) {
  return (
    <RadixSelect.Root {...props}>
      <RadixSelect.Trigger
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className={cn(
          controlClass,
          "flex items-center justify-between gap-3 text-left data-placeholder:text-muted/70",
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="size-4" aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/5"
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="flex h-10 cursor-default items-center justify-between rounded-lg px-3 text-sm outline-none select-none data-disabled:opacity-40 data-highlighted:bg-field"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check className="size-4" aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
