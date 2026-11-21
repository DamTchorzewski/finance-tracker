import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import { formatMoney } from "@/lib/money.ts";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * An amount of money: formatted with Intl, in tabular figures, blurred in privacy mode (the `amount` class),
 * optionally counting up to its value (skipped with reduced motion). The sign is written out, so colour is never the
 * only hint. Screen readers get the final text once, not every step of the count.
 */
export function Amount({
  minor,
  currency,
  signed,
  compact,
  countUp,
  tone,
  className,
}: {
  minor: number;
  currency: string;
  signed?: boolean;
  compact?: boolean;
  countUp?: boolean;
  tone?: "auto" | "positive" | "negative";
  className?: string;
}) {
  const { locale } = useI18n();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(countUp ? 0 : minor);
  const text = formatMoney(minor, currency, locale, { signed, compact });

  useEffect(() => {
    const node = ref.current;
    const from = shown.current;
    if (!countUp || !node || from === minor || reducedMotion()) {
      shown.current = minor;
      if (node) node.textContent = text;
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      const value = Math.round(from + (minor - from) * easeOut(progress));
      shown.current = value;
      node.textContent = formatMoney(value, currency, locale, { signed, compact });
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [minor, currency, locale, signed, compact, countUp, text]);

  const colour =
    tone === "positive" || (tone === "auto" && minor > 0)
      ? "text-positive"
      : tone === "negative" || (tone === "auto" && minor < 0)
        ? "text-negative"
        : undefined;

  return (
    <span className={cn("amount tabular", colour, className)} tabIndex={-1}>
      <span ref={ref} aria-hidden={countUp ? true : undefined}>
        {text}
      </span>
      {countUp && <span className="sr-only">{text}</span>}
    </span>
  );
}
