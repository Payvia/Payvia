"use client";

import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion/tokens";
import {
  activeHref,
  primaryNav,
  secondaryNav,
  tabNav,
  type NavItem,
} from "./nav";

const allNav = [...primaryNav, ...secondaryNav];

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
    >
      {active ? (
        <m.span
          layoutId="sidebar-active"
          transition={spring.ui}
          className="absolute inset-0 rounded-lg bg-field"
        />
      ) : null}
      <Icon className="relative size-4 shrink-0" strokeWidth={1.75} />
      <span className="relative truncate">{item.label}</span>
    </Link>
  );
}

export function SidebarNav() {
  const active = activeHref(usePathname(), allNav);
  return (
    <nav
      aria-label="Main"
      className="flex flex-1 flex-col justify-between gap-6"
    >
      <ul className="flex flex-col gap-1">
        {primaryNav.map((item) => (
          <li key={item.href}>
            <SidebarLink item={item} active={item.href === active} />
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-1 border-t border-line pt-3">
        {secondaryNav.map((item) => (
          <li key={item.href}>
            <SidebarLink item={item} active={item.href === active} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BottomTabs() {
  const active = activeHref(usePathname(), tabNav);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabNav.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === active;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px]",
                  isActive ? "text-brand" : "text-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
