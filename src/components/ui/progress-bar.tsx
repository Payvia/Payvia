import { cn } from "@/lib/cn";

type ProgressBarProps = {
  label: string;
  /** 0–1. Omit for an indeterminate bar. */
  value?: number;
  className?: string;
};

export function ProgressBar({ label, value, className }: ProgressBarProps) {
  const determinate = value !== undefined;
  const clamped = determinate ? Math.min(1, Math.max(0, value)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(clamped * 100) : undefined}
      className={cn(
        "h-1 w-full overflow-hidden rounded-full bg-brand-soft",
        className,
      )}
    >
      {determinate ? (
        <div
          className="h-full origin-left rounded-full bg-brand transition-transform duration-500 ease-(--ease-out-expo)"
          style={{ transform: `scaleX(${clamped})` }}
        />
      ) : (
        <div className="h-full w-2/5 animate-indeterminate rounded-full bg-brand" />
      )}
    </div>
  );
}
