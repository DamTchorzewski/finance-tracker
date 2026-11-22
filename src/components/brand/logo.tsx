import markSmall from "../../../assets/brand/piggo-mark-small.svg?raw";
import markFull from "../../../assets/brand/piggo-mark-mono.svg?raw";
import wordmarkSvg from "../../../assets/brand/piggo-wordmark.svg?raw";
import { cn } from "@/lib/cn.ts";

/*
 * The Piggo mark and wordmark (docs/brand.md), inlined from assets/brand so they take the theme's colours: the mark and
 * the dot of the i in the accent, the letters in the text colour. The wordmark is a drawing, never typed in a font.
 * Both are decorative here: the link or heading around them carries the name.
 */
const bare = (svg: string) => svg.replace(/ role="img" aria-label="Piggo"/, "");

// below 40 px the small mark (no eye, no tail, a wider slot); from 40 px the full one
const SMALL = bare(markSmall).replace(/#943593/g, "currentColor");
const FULL = bare(markFull);
const WORDMARK = bare(wordmarkSvg)
  .replace('stroke="#1d151d"', 'stroke="currentColor"')
  .replace('fill="#943593"', 'fill="var(--accent)"');

const svgBox = "[&>svg]:block [&>svg]:size-full";

export function PiggoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 text-accent", svgBox, className)}
      style={{ width: size, height: size }}
      // a file of this repository bundled at build time, never user input
      dangerouslySetInnerHTML={{ __html: size < 40 ? SMALL : FULL }}
    />
  );
}

/** The wordmark at a given height; its width follows the drawing (108 : 48). */
export function PiggoWordmark({ height = 22, className }: { height?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 text-foreground", svgBox, className)}
      style={{ height, width: (height * 108) / 48 }}
      dangerouslySetInnerHTML={{ __html: WORDMARK }}
    />
  );
}

/** Mark and wordmark side by side, as in the lockup. */
export function PiggoLockup({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PiggoMark />
      {!compact && <PiggoWordmark />}
    </span>
  );
}
