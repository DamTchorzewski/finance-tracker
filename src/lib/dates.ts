// Calendar days are ISO strings (YYYY-MM-DD) in Warsaw time, like the API's transaction dates.

const warsawDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const today = (now: Date = new Date()): string => warsawDay.format(now);

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(d, last));
  return date.toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * The budget month that contains a day, when months start on `startDay` (the pay day, 1-28).
 * With startDay 10, 2026-11-05 belongs to 2026-10-10 … 2026-11-09.
 */
export function payMonth(day: string, startDay: number): { from: string; to: string } {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const start = new Date(Date.UTC(y, d >= startDay ? m - 1 : m - 2, startDay));
  const from = start.toISOString().slice(0, 10);
  return { from, to: addDays(addMonths(from, 1), -1) };
}

export type PeriodKey = "7d" | "30d" | "month" | "90d" | "year";
export const PERIODS: PeriodKey[] = ["7d", "30d", "month", "90d", "year"];

/** The days a period switch stands for, ending today (the month is the current pay month). */
export function periodRange(period: PeriodKey, startDay: number, now = today()) {
  switch (period) {
    case "7d":
      return { from: addDays(now, -6), to: now };
    case "30d":
      return { from: addDays(now, -29), to: now };
    case "90d":
      return { from: addDays(now, -89), to: now };
    case "year":
      return { from: addDays(addMonths(now, -12), 1), to: now };
    case "month": {
      // the current pay month, up to today: the days still to come have nothing to show yet
      const month = payMonth(now, startDay);
      return { from: month.from, to: month.to < now ? month.to : now };
    }
  }
}

/** The same length of time just before a range (for "vs the previous period"). */
export function previousRange(range: { from: string; to: string }) {
  const length = daysBetween(range.from, range.to) + 1;
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

const dayFormats = new Map<string, Intl.DateTimeFormat>();

export function formatDay(
  day: string,
  locale: string,
  style: "short" | "long" | "weekday" = "short",
) {
  const key = `${locale}|${style}`;
  let format = dayFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
      timeZone: "UTC",
      ...(style === "short" && { day: "numeric", month: "short" }),
      ...(style === "long" && { day: "numeric", month: "long", year: "numeric" }),
      ...(style === "weekday" && { weekday: "long", day: "numeric", month: "long" }),
    });
    dayFormats.set(key, format);
  }
  return format.format(new Date(`${day}T00:00:00Z`));
}
