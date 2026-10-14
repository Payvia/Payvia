import Link from "next/link";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

export function Wordmark({
  href = routes.home,
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("text-xl tracking-tight", className)}>
      PayVia
    </Link>
  );
}
