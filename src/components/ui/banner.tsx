import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  info: { box: "bg-brand-soft text-brand-ink", icon: Info },
  success: { box: "bg-info-soft text-info-ink", icon: Info },
  danger: { box: "bg-danger-soft text-danger-ink", icon: TriangleAlert },
} as const;

type BannerProps = {
  tone?: keyof typeof tones;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Inline note, such as "You'll review everything before approving". */
export function Banner({
  tone = "info",
  title,
  children,
  action,
  className,
}: BannerProps) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "note"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl p-3 text-xs",
        box,
        className,
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <div>{children}</div>
      </div>
      {action}
    </div>
  );
}
