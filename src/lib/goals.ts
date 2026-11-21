import type { Contribution, Goal } from "@/data/types.ts";
import { daysBetween, today } from "./dates.ts";

export type GoalState = "done" | "on-track" | "behind" | "no-date" | "overdue";

export interface GoalPace {
  ratio: number;
  leftMinor: number;
  /** Whole months until the target day (at least 1 while it is ahead). */
  monthsLeft: number | null;
  /** What to put aside each month from now on to reach the target in time. */
  perMonthMinor: number | null;
  /** What was put in, on average, per month over the last three months (contributions only). */
  recentPerMonthMinor: number | null;
  state: GoalState;
}

/**
 * Where a goal stands: how much is left, how much to save per month until its day, and whether the recent pace is
 * enough. A goal linked to an account has no contributions, so its pace is only the monthly amount needed.
 */
export function goalPace(goal: Goal, contributions: Contribution[] = [], now = today()): GoalPace {
  const ratio = goal.targetMinor ? Math.max(0, goal.savedMinor / goal.targetMinor) : 0;
  const leftMinor = Math.max(0, goal.targetMinor - goal.savedMinor);

  const recent = contributions
    .filter((c) => daysBetween(c.date, now) >= 0 && daysBetween(c.date, now) <= 91)
    .reduce((sum, c) => sum + c.amountMinor, 0);
  const recentPerMonthMinor = contributions.length ? Math.round(recent / 3) : null;

  if (leftMinor === 0) {
    return {
      ratio,
      leftMinor,
      monthsLeft: null,
      perMonthMinor: null,
      recentPerMonthMinor,
      state: "done",
    };
  }
  if (!goal.targetDate) {
    return {
      ratio,
      leftMinor,
      monthsLeft: null,
      perMonthMinor: null,
      recentPerMonthMinor,
      state: "no-date",
    };
  }
  const days = daysBetween(now, goal.targetDate);
  if (days < 0) {
    return {
      ratio,
      leftMinor,
      monthsLeft: 0,
      perMonthMinor: leftMinor,
      recentPerMonthMinor,
      state: "overdue",
    };
  }
  const monthsLeft = Math.max(1, Math.ceil(days / 30.44));
  const perMonthMinor = Math.ceil(leftMinor / monthsLeft);
  const state =
    recentPerMonthMinor === null || recentPerMonthMinor >= perMonthMinor ? "on-track" : "behind";
  return { ratio, leftMinor, monthsLeft, perMonthMinor, recentPerMonthMinor, state };
}
