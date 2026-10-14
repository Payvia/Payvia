import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = Omit<ComponentProps<"button">, "aria-label"> & {
  /** Required: icon buttons have no visible text. */
  label: string;
  size?: "sm" | "md";
  /** Render the child element (a link, for example) with icon-button styling. */
  asChild?: boolean;
};

export function IconButton({
  label,
  size = "md",
  asChild = false,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  const classes = cn(
    "relative inline-flex shrink-0 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-field",
    "disabled:pointer-events-none disabled:opacity-40",
    // Keep a 44px touch target on small icons.
    "after:absolute after:-inset-1.5 after:content-[''] md:after:hidden",
    size === "sm" ? "size-7 [&_svg]:size-3.5" : "size-9 [&_svg]:size-[18px]",
    className,
  );

  if (asChild) {
    return <Slot.Root aria-label={label} className={classes} {...props} />;
  }
  return (
    <button type={type} aria-label={label} className={classes} {...props} />
  );
}
