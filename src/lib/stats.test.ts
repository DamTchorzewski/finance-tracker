import { describe, expect, it } from "vitest";
import type { Account, Budget, Transaction } from "@/data/types.ts";
import { addDays, addMonths, payMonth, periodRange, previousRange } from "./dates.ts";
import { amountInput, formatMoney, parseAmount } from "./money.ts";
import { budgetProgress, byCategory, cashflowSeries, netWorth, totals } from "./stats.ts";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  accountId: "a",
  kind: "expense",
  amountMinor: 1000,
  currency: "PLN",
  date: "2026-11-10",
  categoryId: "food",
  note: "",
  payee: null,
  tags: [],
  toAccountId: null,
  toAmountMinor: null,
  plnMinor: 1000,
  rate: { source: "pln", date: "2026-11-10", mid: 1 },
  origin: "app",
  createdAt: "2026-11-10T10:00:00.000Z",
  updatedAt: "2026-11-10T10:00:00.000Z",
  ...over,
});

describe("money", () => {
  it("reads what people type", () => {
    expect(parseAmount("12", "PLN")).toBe(1200);
    expect(parseAmount("12,5", "PLN")).toBe(1250);
    expect(parseAmount("1 234,56 zł", "PLN")).toBe(123_456);
    expect(parseAmount("1.005", "PLN")).toBe(101);
    expect(parseAmount("abc", "PLN")).toBeNull();
    expect(parseAmount("", "PLN")).toBeNull();
  });

  it("formats in the user's language", () => {
    // Polish groups thousands only from five digits (CLDR): 8640,00 zł but 18 640,00 zł
    expect(formatMoney(864_000, "PLN", "pl").replace(/\s/g, " ")).toBe("8640,00 zł");
    expect(formatMoney(1_864_000, "PLN", "pl").replace(/\s/g, " ")).toBe("18 640,00 zł");
    expect(formatMoney(-2500, "EUR", "en")).toBe("-€25.00");
    expect(amountInput(1250, "PLN", "pl")).toBe("12,50");
  });
});

describe("dates", () => {
  it("knows the pay-day month", () => {
    expect(payMonth("2026-11-05", 10)).toEqual({ from: "2026-10-10", to: "2026-11-09" });
    expect(payMonth("2026-11-10", 10)).toEqual({ from: "2026-11-10", to: "2026-12-09" });
    expect(payMonth("2026-03-15", 1)).toEqual({ from: "2026-03-01", to: "2026-03-31" });
    expect(payMonth("2026-01-03", 28)).toEqual({ from: "2025-12-28", to: "2026-01-27" });
  });

  it("builds periods and the one before", () => {
    expect(periodRange("7d", 1, "2026-11-21")).toEqual({ from: "2026-11-15", to: "2026-11-21" });
    expect(previousRange({ from: "2026-11-15", to: "2026-11-21" })).toEqual({
      from: "2026-11-08",
      to: "2026-11-14",
    });
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("stats", () => {
  const mids = { EUR: 4.25 };

  it("adds income and expenses but not transfers", () => {
    const list = [
      tx({ kind: "income", plnMinor: 10_000 }),
      tx({ plnMinor: 2500 }),
      tx({ kind: "transfer", plnMinor: 9999 }),
    ];
    expect(totals(list, "PLN", mids)).toEqual({ income: 10_000, expenses: 2500, net: 7500 });
    expect(totals(list, "EUR", mids).income).toBe(2353);
  });

  it("sums accounts in the base currency", () => {
    const accounts = [
      { currency: "PLN", balanceMinor: 10_000 },
      { currency: "EUR", balanceMinor: 1000 },
    ] as Account[];
    expect(netWorth(accounts, "PLN", mids)).toBe(14_250);
  });

  it("ranks categories and fills an empty chart bucket", () => {
    const list = [
      tx({ categoryId: "food", plnMinor: 100 }),
      tx({ categoryId: "fun", plnMinor: 300 }),
      tx({ categoryId: "food", plnMinor: 50 }),
    ];
    expect(byCategory(list, "PLN", mids).map((c) => c.categoryId)).toEqual(["fun", "food"]);
    const series = cashflowSeries(
      [tx({ date: "2026-11-03" })],
      "2026-11-01",
      "2026-11-07",
      "PLN",
      mids,
    );
    expect(series).toHaveLength(7);
    expect(series[2]?.expenses).toBe(1000);
  });

  it("measures the budgets", () => {
    const budget = {
      categoryId: "food",
      limitMinor: 1000,
      currency: "PLN",
      alertAt: [0.8, 1],
    } as Budget;
    const [half] = budgetProgress([budget], [tx({ plnMinor: 500 })], mids);
    expect(half).toMatchObject({ spent: 500, ratio: 0.5, state: "ok" });
    expect(budgetProgress([budget], [tx({ plnMinor: 850 })], mids)[0]?.state).toBe("warning");
    expect(budgetProgress([budget], [tx({ plnMinor: 1200 })], mids)[0]?.state).toBe("over");
  });
});
