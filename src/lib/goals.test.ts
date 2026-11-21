import { describe, expect, it } from "vitest";
import type { Contribution, Goal } from "@/data/types.ts";
import { goalPace } from "./goals.ts";

const NOW = "2026-11-22";

const goal = (over: Partial<Goal>): Goal => ({
  id: "g",
  name: "Wakacje",
  targetMinor: 800_000,
  currency: "PLN",
  targetDate: "2027-05-22",
  accountId: null,
  icon: "plane",
  colour: "sky",
  archived: false,
  order: 0,
  savedMinor: 200_000,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const put = (date: string, amountMinor: number): Contribution => ({
  id: date,
  goalId: "g",
  amountMinor,
  date,
  note: "",
  createdAt: `${date}T10:00:00.000Z`,
});

describe("goal pace", () => {
  it("splits what is left over the months until the day", () => {
    const pace = goalPace(goal({}), [], NOW);
    expect(pace.leftMinor).toBe(600_000);
    expect(pace.monthsLeft).toBe(6);
    expect(pace.perMonthMinor).toBe(100_000);
    expect(pace.ratio).toBeCloseTo(0.25);
    expect(pace.state).toBe("on-track");
  });

  it("compares the last three months with what is needed", () => {
    const slow = [put("2026-09-10", 30_000), put("2026-10-10", 30_000), put("2026-11-10", 30_000)];
    expect(goalPace(goal({}), slow, NOW)).toMatchObject({
      recentPerMonthMinor: 30_000,
      state: "behind",
    });
    const fast = [put("2026-10-10", 200_000), put("2026-11-10", 150_000)];
    expect(goalPace(goal({}), fast, NOW).state).toBe("on-track");
  });

  it("knows a reached, an open-ended and a late goal", () => {
    expect(goalPace(goal({ savedMinor: 900_000 }), [], NOW)).toMatchObject({
      state: "done",
      leftMinor: 0,
    });
    expect(goalPace(goal({ targetDate: null }), [], NOW).state).toBe("no-date");
    expect(goalPace(goal({ targetDate: "2026-10-01" }), [], NOW)).toMatchObject({
      state: "overdue",
      perMonthMinor: 600_000,
    });
  });
});
