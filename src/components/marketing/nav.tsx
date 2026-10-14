"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { duration, ease, stagger } from "@/lib/motion/tokens";
import { routes } from "@/lib/routes";
import { sectionLinks } from "./links";

export function Nav() {
  const [open, setOpen] = useState(false);
  const links = [...sectionLinks, { label: "Log in", href: routes.login }];

  return (
    <header className="relative z-20 flex items-center justify-between">
      <Wordmark className="text-2xl text-white" />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="flex h-9 items-center gap-6 rounded-full bg-white/25 pr-4 pl-4 text-xs tracking-wide text-white backdrop-blur-md transition-colors hover:bg-white/35">
          {open ? "CLOSE" : "MENU"}
          <m.span
            aria-hidden
            className="size-2 rounded-full bg-white"
            animate={{ scale: open ? 1.6 : 1 }}
          />
        </Popover.Trigger>
        <AnimatePresence>
          {open ? (
            <Popover.Portal forceMount>
              <Popover.Content asChild forceMount align="end" sideOffset={12}>
                <m.nav
                  aria-label="Site menu"
                  className="z-50 w-[min(21rem,calc(100vw-2rem))] origin-top-right rounded-[1.75rem] bg-surface p-6 shadow-2xl shadow-black/15"
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: duration.base, ease: ease.out }}
                >
                  <ul>
                    {links.map((link, index) => (
                      <m.li
                        key={link.href}
                        className="border-b border-line"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: duration.base,
                          ease: ease.out,
                          delay: 0.05 + index * stagger.tight,
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="block py-4 text-lg transition-colors hover:text-brand"
                        >
                          {link.label}
                        </Link>
                      </m.li>
                    ))}
                  </ul>
                  <Link
                    href={routes.signup}
                    className={buttonClass({
                      size: "lg",
                      pill: true,
                      className: "mt-6 w-full",
                    })}
                  >
                    Get started
                  </Link>
                </m.nav>
              </Popover.Content>
            </Popover.Portal>
          ) : null}
        </AnimatePresence>
      </Popover.Root>
    </header>
  );
}
