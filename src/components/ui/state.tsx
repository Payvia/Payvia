import { TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Buttons or links. */
  action?: ReactNode;
  className?: string;
};

/** "Nothing here yet" panel for lists and dashboards. */
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: StateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-field">
          <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <p className="text-sm">{title}</p>
      {description ? (
        <p className="max-w-xs text-xs text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex gap-2">{action}</div> : null}
    </div>
  );
}

/** "Something went wrong" panel with a recovery action. */
export function ErrorState({
  title,
  description,
  icon: Icon = TriangleAlert,
  action,
  className,
}: StateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-1 rounded-panel border border-line bg-surface p-5",
        className,
      )}
    >
      <span className="mb-2 flex size-9 items-center justify-center rounded-full bg-danger-soft text-danger">
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-sm">{title}</p>
      {description ? <p className="text-xs text-muted">{description}</p> : null}
      {action ? <div className="mt-3 flex gap-2">{action}</div> : null}
    </div>
  );
}
