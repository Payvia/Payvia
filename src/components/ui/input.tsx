import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const controlClass = cn(
  "h-12 w-full rounded-xl bg-field px-4 text-ink outline-none placeholder:text-muted/70",
  // 16px on mobile stops iOS zooming on focus.
  "text-base md:text-sm",
  "ring-brand transition-shadow duration-150 focus-visible:ring-2",
  "aria-invalid:ring-1 aria-invalid:ring-danger",
  "read-only:cursor-default disabled:cursor-not-allowed disabled:opacity-60",
);

type InputProps = ComponentProps<"input"> & {
  /** Element rendered inside the field on the right, such as a copy button. */
  trailing?: ReactNode;
};

export function Input({ className, trailing, ...props }: InputProps) {
  if (!trailing) {
    return <input className={cn(controlClass, className)} {...props} />;
  }
  return (
    <div className="relative">
      <input className={cn(controlClass, "pr-12", className)} {...props} />
      <div className="absolute inset-y-0 right-2 flex items-center">
        {trailing}
      </div>
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlClass, "h-auto min-h-24 resize-y py-3", className)}
      {...props}
    />
  );
}
