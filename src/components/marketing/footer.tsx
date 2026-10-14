import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Wordmark } from "@/components/wordmark";
import { routes } from "@/lib/routes";
import { sectionLinks } from "./links";

const columns = [
  { title: "Product", links: sectionLinks },
  {
    title: "Account",
    links: [
      { label: "Log in", href: routes.login },
      { label: "Sign up", href: routes.signup },
    ],
  },
  {
    title: "Network",
    links: [
      { label: "Built on Stellar", href: "https://stellar.org" },
      { label: "Testnet MVP", href: null },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mx-auto max-w-[90rem] px-4 pt-16 pb-12 md:px-6 md:pt-24">
      <Stagger className="grid gap-12 md:grid-cols-[1fr_auto]">
        <StaggerItem>
          <Wordmark className="text-3xl" />
          <p className="mt-3 text-sm text-muted">
            Payment links and QR payments on Stellar.
          </p>
        </StaggerItem>
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-24">
          {columns.map((column) => (
            <StaggerItem key={column.title}>
              <p className="text-xs text-muted">{column.title}</p>
              <ul className="mt-4 flex flex-col gap-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link
                        href={link.href}
                        className="transition-colors hover:text-brand"
                        {...(link.href.startsWith("http")
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      link.label
                    )}
                  </li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </div>
      </Stagger>
    </footer>
  );
}
