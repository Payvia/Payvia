"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Dialog as RadixDialog } from "radix-ui";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { duration, ease, spring } from "@/lib/motion/tokens";

type OverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * These overlays are opened by state rather than a Radix trigger, so Radix has
 * no element to hand focus back to. Remember what was focused and restore it.
 */
function useReturnFocus() {
  const previous = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      previous.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      previous.current?.focus();
    },
  };
}

function Backdrop() {
  return (
    <RadixDialog.Overlay asChild forceMount>
      <m.div
        className="fixed inset-0 z-40 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.base }}
      />
    </RadixDialog.Overlay>
  );
}

function Heading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <RadixDialog.Title className="text-base">{title}</RadixDialog.Title>
      {description ? (
        <RadixDialog.Description className="mt-1 text-xs text-muted">
          {description}
        </RadixDialog.Description>
      ) : null}
    </>
  );
}

/** Centred modal. Traps focus, closes on Escape, restores focus on close. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: OverlayProps) {
  const returnFocus = useReturnFocus();
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <Backdrop />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <RadixDialog.Content asChild forceMount {...returnFocus}>
                <m.div
                  className={cn(
                    "pointer-events-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-panel bg-surface p-5 shadow-2xl shadow-black/10 outline-none",
                    className,
                  )}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: duration.base, ease: ease.out }}
                >
                  <Heading title={title} description={description} />
                  <div className="mt-4">{children}</div>
                </m.div>
              </RadixDialog.Content>
            </div>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

/** Bottom sheet. Drag down or flick to dismiss. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: OverlayProps) {
  const returnFocus = useReturnFocus();
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <Backdrop />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
              <RadixDialog.Content asChild forceMount {...returnFocus}>
                <m.div
                  className={cn(
                    "pointer-events-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-sheet bg-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none",
                    className,
                  )}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={spring.ui}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 120 || info.velocity.y > 600) {
                      onOpenChange(false);
                    }
                  }}
                >
                  <div
                    aria-hidden
                    className="mx-auto mb-4 h-1 w-9 rounded-full bg-line"
                  />
                  <Heading title={title} description={description} />
                  <div className="mt-4">{children}</div>
                </m.div>
              </RadixDialog.Content>
            </div>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
