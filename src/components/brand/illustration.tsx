import type { CSSProperties } from "react";
import { cn } from "@/lib/cn.ts";

/*
 * The illustrations (src/assets/illustrations) colour themselves with --ill-* variables; this maps them to the app
 * tokens, so they follow the theme and the accent hue. light-dark() works because the theme sets color-scheme.
 */
const THEME = {
  "--ill-accent": "var(--accent)",
  "--ill-accent-soft": "var(--accent-soft)",
  "--ill-surface": "var(--surface)",
  "--ill-surface-2": "var(--surface-2)",
  "--ill-paper": "light-dark(var(--surface), oklch(0.29 0.02 var(--accent-h)))",
  "--ill-line": "var(--border)",
  "--ill-ink": "var(--fg)",
  "--ill-muted": "var(--muted)",
  "--ill-pig-light":
    "light-dark(oklch(0.985 0.012 var(--accent-h)), oklch(0.95 0.03 var(--accent-h)))",
  "--ill-coin": "var(--coin, #f1ba4b)",
  "--ill-coin-deep": "var(--coin-deep, #ad721c)",
} as CSSProperties;

/**
 * An illustration inlined from its SVG text (`import svg from "@/assets/illustrations/offline.svg?raw"`).
 * Decorative: the text next to it carries the meaning, so it is hidden from screen readers.
 */
export function Illustration({ svg, className }: { svg: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block [&>svg]:block [&>svg]:h-auto [&>svg]:w-full", className)}
      style={THEME}
      // the SVG is a file of this repository bundled at build time, never user input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
