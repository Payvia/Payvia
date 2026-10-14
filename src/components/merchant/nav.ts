import {
  ArrowLeftRight,
  CirclePlus,
  House,
  MessageCircle,
  Plus,
  QrCode,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { routes } from "@/lib/routes";

export const supportHref = "mailto:support@payvia.app";

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: routes.dashboard, icon: House },
  { label: "Create payment request", href: routes.newPayment, icon: Plus },
  { label: "Payments", href: routes.payments, icon: ArrowLeftRight },
  { label: "QR codes", href: routes.qrCodes, icon: QrCode },
];

export const secondaryNav: NavItem[] = [
  { label: "Support", href: supportHref, icon: MessageCircle },
  { label: "Settings", href: routes.settings, icon: Settings },
];

/** Mobile tab bar, as in the designs. QR codes are reached from a payment. */
export const tabNav: NavItem[] = [
  { label: "Dashboard", href: routes.dashboard, icon: House },
  { label: "Create", href: routes.newPayment, icon: CirclePlus },
  { label: "Payments", href: routes.payments, icon: ArrowLeftRight },
  { label: "Settings", href: routes.settings, icon: Settings },
];

/** The most specific nav item matching the current path. */
export function activeHref(pathname: string, items: NavItem[]) {
  return items
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
