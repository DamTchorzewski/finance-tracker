import type { Account, Budget, Transaction } from "@/data/types.ts";
import { addDays, daysBetween } from "./dates.ts";
import { convertMinor } from "./money.ts";

// Calculations for the dashboard and the budgets. Every transaction carries its value in PLN at the rate of its day
// (`plnMinor`); a report in another base currency converts that PLN value at today's rate.

/** PLN per unit of each currency (NBP mid); PLN itself is 1. */
export type Mids = Record<string, number>;

export const midOf = (mids: Mids, code: string) => (code === "PLN" ? 1 : (mids[code] ?? NaN));

/** A transaction's value in the base currency (expenses and income only; transfers move money between own accounts). */
export const baseValue = (tx: Transaction, base: string, mids: Mids) =>
  base === "PLN"
    ? tx.plnMinor
    : convertMinor(tx.plnMinor, { code: "PLN", mid: 1 }, { code: base, mid: midOf(mids, base) });

export function totals(transactions: Transaction[], base: string, mids: Mids) {
  let income = 0;
  let expenses = 0;
  for (const tx of transactions) {
    if (tx.kind === "income") income += baseValue(tx, base, mids);
    else if (tx.kind === "expense") expenses += baseValue(tx, base, mids);
  }
  return { income, expenses, net: income - expenses };
}

/** The sum of all accounts in the base currency, at today's rates. Archived accounts count too: the money exists. */
export function netWorth(accounts: Account[], base: string, mids: Mids) {
  return accounts.reduce(
    (sum, account) =>
      sum +
      convertMinor(
        account.balanceMinor,
        { code: account.currency, mid: midOf(mids, account.currency) },
        { code: base, mid: midOf(mids, base) },
      ),
    0,
  );
}

export function byCategory(
  transactions: Transaction[],
  base: string,
  mids: Mids,
  kind: "expense" | "income" = "expense",
) {
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.kind !== kind) continue;
    const key = tx.categoryId ?? "none";
    sums.set(key, (sums.get(key) ?? 0) + baseValue(tx, base, mids));
  }
  return [...sums.entries()]
    .map(([categoryId, minor]) => ({ categoryId, minor }))
    .sort((a, b) => b.minor - a.minor);
}

/**
 * Income and expenses per bucket between two days: daily up to 31 days, weekly up to 120, monthly beyond.
 * Buckets with nothing in them are kept, so the chart has no gaps.
 */
export function cashflowSeries(
  transactions: Transaction[],
  from: string,
  to: string,
  base: string,
  mids: Mids,
) {
  const length = daysBetween(from, to) + 1;
  const step = length <= 31 ? 1 : length <= 120 ? 7 : 0;
  const buckets: { start: string; income: number; expenses: number }[] = [];
  if (step) {
    for (let day = from; day <= to; day = addDays(day, step))
      buckets.push({ start: day, income: 0, expenses: 0 });
  } else {
    for (let month = from.slice(0, 7); month <= to.slice(0, 7);) {
      buckets.push({ start: `${month}-01`, income: 0, expenses: 0 });
      const [y, m] = month.split("-").map(Number) as [number, number];
      month = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    }
  }
  for (const tx of transactions) {
    if (tx.kind === "transfer" || tx.date < from || tx.date > to) continue;
    const index = step
      ? Math.floor(daysBetween(from, tx.date) / step)
      : buckets.findIndex((b) => b.start.slice(0, 7) === tx.date.slice(0, 7));
    const bucket = buckets[index];
    if (!bucket) continue;
    if (tx.kind === "income") bucket.income += baseValue(tx, base, mids);
    else bucket.expenses += baseValue(tx, base, mids);
  }
  return buckets;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  limit: number;
  ratio: number;
  state: "ok" | "warning" | "over";
}

/** How much of each budget the month's expenses used, in the budget's currency. */
export function budgetProgress(
  budgets: Budget[],
  transactions: Transaction[],
  mids: Mids,
): BudgetProgress[] {
  return budgets.map((budget) => {
    const spent = transactions
      .filter((tx) => tx.kind === "expense" && tx.categoryId === budget.categoryId)
      .reduce((sum, tx) => sum + baseValue(tx, budget.currency, mids), 0);
    const ratio = budget.limitMinor ? spent / budget.limitMinor : 0;
    const warnAt = Math.min(...budget.alertAt.filter((a) => a < 1), 0.8);
    return {
      budget,
      spent,
      limit: budget.limitMinor,
      ratio,
      state: ratio > 1 ? "over" : ratio >= warnAt ? "warning" : "ok",
    };
  });
}

/** The change against the previous period as a ratio (0.12 = +12 %), or null when there is nothing to compare. */
export const change = (now: number, before: number) =>
  before === 0 ? null : (now - before) / Math.abs(before);
