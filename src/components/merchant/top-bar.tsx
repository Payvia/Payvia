"use client";

import {
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu, Popover } from "radix-ui";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { Wordmark } from "@/components/wordmark";
import { api } from "@/lib/api";
import { routes } from "@/lib/routes";
import { useMerchant } from "./merchant-provider";
import { supportHref } from "./nav";

const menuClass =
  "border-line bg-surface z-50 min-w-48 rounded-xl border p-1 shadow-lg shadow-black/5";
const menuItemClass =
  "data-highlighted:bg-field flex h-9 cursor-default items-center gap-2 rounded-lg px-2.5 text-[13px] outline-none select-none";

function SearchForm() {
  const router = useRouter();
  return (
    <form
      role="search"
      className="hidden flex-1 md:block"
      action={(data) => {
        const q = String(data.get("q") ?? "").trim();
        router.push(
          q ? `${routes.payments}?q=${encodeURIComponent(q)}` : routes.payments,
        );
      }}
    >
      <input
        name="q"
        type="search"
        aria-label="Search payments"
        placeholder="Search payments, requests, etc."
        className="h-9 w-full rounded-full border border-line px-4 text-xs outline-none placeholder:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      />
    </form>
  );
}

function Notifications() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton label="Notifications">
          <Bell strokeWidth={1.75} />
        </IconButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={`${menuClass} w-64 p-4`}
        >
          <p className="text-sm">Notifications</p>
          <p className="mt-1 text-xs text-muted">
            Nothing yet. Payment confirmations will appear here.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AccountMenu() {
  const merchant = useMerchant();
  const displayName = merchant.business_name || merchant.name;

  async function logout() {
    try {
      await api.auth.logout();
      // Full page load so no cached data or routes outlive the session.
      window.location.assign(routes.login);
    } catch {
      toast.error("Could not log out. Please try again.");
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full outline-offset-2"
      >
        <Avatar name={displayName} src={merchant.logo_url} size={32} />
        <ChevronDown className="size-3.5" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className={menuClass}>
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px]">{displayName}</p>
            <p className="truncate text-xs text-muted">{merchant.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild className={menuItemClass}>
            <Link href={routes.settings}>
              <Settings className="size-4" strokeWidth={1.75} aria-hidden />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItemClass} onSelect={logout}>
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 md:h-16 md:px-6 print:hidden">
      <Wordmark href={routes.dashboard} className="md:hidden" />
      <SearchForm />
      <div className="ml-auto flex items-center gap-1">
        <IconButton label="Search payments" className="md:hidden" asChild>
          <Link href={routes.payments}>
            <Search strokeWidth={1.75} />
          </Link>
        </IconButton>
        <IconButton label="Help and support" asChild>
          <a href={supportHref}>
            <CircleHelp strokeWidth={1.75} />
          </a>
        </IconButton>
        <Notifications />
        <span aria-hidden className="mx-2 h-5 w-px bg-line" />
        <AccountMenu />
      </div>
    </header>
  );
}
