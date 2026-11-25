import { cn } from "@/lib/cn.ts";
import type { BudgetProgress } from "@/lib/stats.ts";

const FILL: Record<BudgetProgress["state"], string> = {
  ok: "bg-accent",
  warning: "bg-warning",
  over: "bg-negative",
};

/** How much of a budget is used, as a bar. */
export function BudgetMeter({
  progress,
  label,
  valueText,
  className,
}: {
  progress: BudgetProgress;
  label?: string;
  valueText?: string;
  className?: string;
}) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={progress.limit}
      aria-valuenow={Math.min(progress.spent, progress.limit)}
      aria-valuetext={valueText}
      className={cn("overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          FILL[progress.state],
        )}
        style={{ width: `${Math.min(100, progress.ratio * 100)}%` }}
      />
    </div>
  );
}
