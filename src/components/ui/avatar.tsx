import Image from "next/image";
import { cn } from "@/lib/cn";

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Merchant logo, falling back to initials. */
export function Avatar({ name, src, size = 32, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[11px] font-medium text-brand-ink",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          unoptimized={src.startsWith("data:")}
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <span aria-label={name}>{initials(name)}</span>
      )}
    </span>
  );
}
