import type { HTMLAttributes, ReactNode } from "react";
import { Illustration } from "@/components/brand/illustration.tsx";
import { cn } from "@/lib/cn.ts";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-bold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-surface-2", className)} />
  );
}

/** An empty list: a brand illustration on full pages (its SVG text), or a small icon tile inside a widget. */
export function EmptyState({
  icon,
  illustration,
  compact,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  illustration?: string;
  /** a smaller illustration, for a dashboard widget */
  compact?: boolean;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      {illustration ? (
        <Illustration svg={illustration} className={compact ? "w-36" : "w-48"} />
      ) : (
        <div className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent [&_svg]:size-7">
          {icon}
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}
