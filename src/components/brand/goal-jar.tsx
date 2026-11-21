import { useId, useState } from "react";
import { cn } from "@/lib/cn.ts";

/* The jar is 120 x 150 user units; the coins fill the inner part (94 units high). */
const INNER = { x: 22, y: 40, w: 76, h: 94 };
const TOP_COINS = [24, 34, 44, 54, 64, 74, 84, 94];
const FACE_COINS: [number, number][] = [
  [34, 58],
  [62, 52],
  [84, 66],
  [46, 80],
  [74, 92],
  [32, 104],
  [58, 112],
  [86, 118],
];

const SPARKS: [number, number][] = [
  [14, 24],
  [106, 20],
  [110, 60],
];

const STYLE = `
.piggo-jar-fill{transition:transform 700ms cubic-bezier(.22,.85,.3,1)}
.piggo-jar-drop{animation:piggo-jar-drop 900ms cubic-bezier(.5,0,.75,0) both}
.piggo-jar-done .piggo-jar-lid{animation:piggo-jar-pop 600ms cubic-bezier(.34,1.56,.64,1) both;transform-box:fill-box;transform-origin:center bottom}
.piggo-jar-done .piggo-jar-spark{animation:piggo-jar-spark 900ms ease-out both}
@keyframes piggo-jar-drop{
  0%{transform:translateY(-24px);opacity:0}
  15%{opacity:1}
  75%{transform:translateY(var(--piggo-drop-to));opacity:1}
  88%{transform:translateY(calc(var(--piggo-drop-to) - 5px))}
  100%{transform:translateY(var(--piggo-drop-to));opacity:0}
}
@keyframes piggo-jar-pop{0%{transform:none}40%{transform:translateY(-6px) rotate(-6deg)}100%{transform:none}}
@keyframes piggo-jar-spark{0%{opacity:0;transform:scale(.4)}40%{opacity:1}100%{opacity:0;transform:scale(1.2)}}
.piggo-jar-spark{opacity:0;transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:reduce){
  .piggo-jar-fill{transition:none}
  .piggo-jar-drop,.piggo-jar-done .piggo-jar-lid,.piggo-jar-done .piggo-jar-spark{animation:none}
  .piggo-jar-drop{opacity:0}
}`;

/**
 * The savings-goal jar: gold coins fill it up to `level` (0 to 1). When the level goes up a coin drops in, and at
 * 1 the lid pops and sparkles. Colours follow the theme tokens; with reduced motion the level just changes.
 * One component serves every goal (the spec of a Rive version is in docs/brand.md).
 */
export function GoalJar({
  level,
  label,
  className,
}: {
  level: number;
  /** what a screen reader hears, e.g. "Wakacje: 55% celu" */
  label: string;
  className?: string;
}) {
  const clip = `piggo-jar-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const value = Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0));
  const [previous, setPrevious] = useState(value);
  const [drops, setDrops] = useState(0);
  if (value !== previous) {
    setPrevious(value);
    if (value > previous) setDrops((count) => count + 1);
  }

  const surface = INNER.y + (1 - value) * INNER.h;
  const done = value >= 1;

  return (
    <svg
      viewBox="0 0 120 150"
      role="img"
      aria-label={label}
      className={cn(done && "piggo-jar-done", className)}
    >
      <style>{STYLE}</style>
      <defs>
        <clipPath id={clip}>
          <rect x={INNER.x} y={INNER.y} width={INNER.w} height={INNER.h} rx={16} />
        </clipPath>
      </defs>

      <rect
        x={18}
        y={36}
        width={84}
        height={102}
        rx={20}
        fill="var(--accent-soft)"
        fillOpacity={0.45}
      />
      <g clipPath={`url(#${clip})`}>
        <g
          className="piggo-jar-fill"
          style={{ transform: `translateY(${(1 - value) * INNER.h}px)` }}
        >
          <rect
            x={INNER.x}
            y={INNER.y + 4}
            width={INNER.w}
            height={INNER.h}
            fill="var(--coin, #f1ba4b)"
          />
          {TOP_COINS.map((cx) => (
            <circle key={cx} cx={cx} cy={INNER.y + 5} r={6} fill="var(--coin, #f1ba4b)" />
          ))}
          {FACE_COINS.map(([cx, cy]) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={5}
              fill="none"
              stroke="var(--coin-deep, #ad721c)"
              strokeWidth={2}
            />
          ))}
        </g>
      </g>
      {drops > 0 && !done ? (
        <g
          key={drops}
          className="piggo-jar-drop"
          style={{ ["--piggo-drop-to" as string]: `${surface - 4}px` }}
        >
          <circle cx={60} cy={0} r={7} fill="var(--coin, #f1ba4b)" />
          <circle
            cx={60}
            cy={0}
            r={4.4}
            fill="none"
            stroke="var(--coin-deep, #ad721c)"
            strokeWidth={1.8}
          />
        </g>
      ) : null}
      <rect
        x={18}
        y={36}
        width={84}
        height={102}
        rx={20}
        fill="none"
        stroke="var(--border)"
        strokeWidth={3}
      />
      <path
        d="M31 54 V82"
        stroke="#ffffff"
        strokeOpacity={0.55}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <rect
        className="piggo-jar-lid"
        x={28}
        y={22}
        width={64}
        height={14}
        rx={6}
        fill="var(--accent)"
      />
      {SPARKS.map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          className="piggo-jar-spark"
          d={`M${x} ${y - 6} V${y + 6} M${x - 6} ${y} H${x + 6}`}
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
