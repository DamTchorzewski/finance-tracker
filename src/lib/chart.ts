import type { CSSProperties } from "react";
import { formatDay } from "./dates.ts";

// What the Recharts charts share. No Recharts import here: the library stays in the chunks of the charts.
export const TOOLTIP_STYLE: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  color: "var(--fg)",
  fontSize: 12,
};

export const AXIS_TICK = { fill: "var(--muted)", fontSize: 11 };

/** The title of a chart tooltip: the day, written out. */
export const dayLabel = (locale: Parameters<typeof formatDay>[1]) => (day: unknown) =>
  typeof day === "string" ? formatDay(day, locale, "long") : "";
