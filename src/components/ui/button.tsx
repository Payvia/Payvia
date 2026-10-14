import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = {
  /** Primary action in the merchant app. */
  ink: "bg-ink text-white hover:bg-ink/85",
  /** Primary action in checkout and on the landing page. */
  brand: "bg-brand text-white hover:bg-brand-deep",
  soft: "bg-field text-ink hover:bg-line",
  "brand-soft": "bg-brand-soft text-ink hover:bg-white",
  outline: "border border-line bg-surface text-ink hover:bg-canvas",
  ghost: "text-ink hover:bg-field",
  danger: "bg-danger text-white hover:bg-danger-ink",
} as const;

const sizes = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-sm",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Fully rounded, as used in checkout and on the landing page. */
  pill?: boolean;
  /** Shows a spinner and blocks interaction. */
  loading?: boolean;
  /** Render the child element (for example a Link) with button styling. */
  asChild?: boolean;
};

export function buttonClass({
  variant = "ink",
  size = "md",
  pill = false,
  className,
}: Pick<ButtonProps, "variant" | "size" | "pill" | "className"> = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap select-none",
    "transition-[background-color,transform,opacity] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
    variants[variant],
    sizes[size],
    pill && "rounded-full",
    className,
  );
}

export function Button({
  variant,
  size,
  pill,
  loading = false,
  asChild = false,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = buttonClass({ variant, size, pill, className });

  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
