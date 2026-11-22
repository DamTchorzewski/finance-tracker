import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Inbox, Plus } from "lucide-react";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { useComposer } from "@/app/composer.tsx";
import onboardingBudgets from "@/assets/illustrations/onboarding-budgets.svg?raw";
import onboardingGoals from "@/assets/illustrations/onboarding-goals.svg?raw";
import { Amount } from "@/components/ui/amount.tsx";
import { Button, buttonStyles } from "@/components/ui/button.tsx";
import { Card, CardHeader, EmptyState, Skeleton } from "@/components/ui/card.tsx";
import { useAccounts, useBudgets, useGoals, useTransactions } from "@/data/queries.ts";
import type { WidgetKey } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import {
  formatDay,
  payMonth,
  periodRange,
  previousRange,
  today,
  type PeriodKey,
} from "@/lib/dates.ts";
import { goalPace } from "@/lib/goals.ts";
import { colourVar } from "@/lib/icons.ts";
import { ProgressRing } from "@/components/ui/progress-ring.tsx";
import {
  budgetProgress,
  byCategory,
  cashflowSeries,
  change,
  netWorth,
  totals,
} from "@/lib/stats.ts";
import { PeriodSwitch, TransactionRow, useBase, useCategoryMap } from "../shared.tsx";
import { PaletteTip } from "./palette-tip.tsx";

const Charts = {
  Cashflow: lazy(() => import("./charts.tsx").then((m) => ({ default: m.CashflowChart }))),
  Donut: lazy(() => import("./charts.tsx").then((m) => ({ default: m.SpendingDonut }))),
};

const percent = (ratio: number, locale: string) =>
  new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(ratio);

function Delta({ ratio, good }: { ratio: number | null; good: "up" | "down" }) {
  const { t, locale } = useI18n();
  if (ratio === null) return null;
  const up = ratio > 0;
  const positive = good === "up" ? up : !up;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold",
          positive ? "bg-positive/12 text-positive" : "bg-negative/12 text-negative",
        )}
      >
        {up ? (
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        ) : (
          <ArrowDownRight aria-hidden="true" className="size-3.5" />
        )}
        {percent(ratio, locale)}
      </span>
      {t.dashboard.vsPrevious}
    </span>
  );
}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const search = useSearch({ from: "/app/" });
  const navigate = useNavigate({ from: "/" });
  const composer = useComposer();
  const { profile, base, mids, ratesTable } = useBase();
  const period: PeriodKey = search.period ?? "month";
  const range = periodRange(period, profile.monthStartDay);
  const before = previousRange(range);
  const month = payMonth(today(), profile.monthStartDay);

  const accounts = useAccounts();
  const current = useTransactions(range);
  const previous = useTransactions(before);
  const monthTx = useTransactions(month);
  const budgets = useBudgets();
  const goals = (useGoals().data ?? []).filter((g) => !g.archived);
  const categories = useCategoryMap();

  // the "add expense" shortcut of the installed app opens the form
  useEffect(() => {
    if (search.add) {
      composer.open({ draft: { kind: search.add } });
      void navigate({ search: (old) => ({ ...old, add: undefined }), replace: true });
    }
  }, [search.add, composer, navigate]);

  const now = totals(current.data ?? [], base, mids);
  const then = totals(previous.data ?? [], base, mids);
  const worth = netWorth(accounts.data ?? [], base, mids);
  const spending = byCategory(current.data ?? [], base, mids).slice(0, 6);
  const spendingTotal = spending.reduce((sum, s) => sum + s.minor, 0);
  const progress = budgetProgress(budgets.data ?? [], monthTx.data ?? [], mids).sort(
    (a, b) => b.ratio - a.ratio,
  );

  const widgets: Record<WidgetKey, ReactNode> = {
    balance: (
      <Card
        key="balance"
        className="relative overflow-hidden md:col-span-2"
        aria-labelledby="w-balance"
      >
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-16 size-64 rounded-full bg-accent/15 blur-3xl"
        />
        <p id="w-balance" className="text-sm font-semibold text-muted">
          {t.dashboard.balance}
        </p>
        {accounts.isPending ? (
          <Skeleton className="mt-2 h-12 w-64" />
        ) : (
          <p className="mt-1 text-[clamp(2.25rem,6vw,3.5rem)] leading-none font-extrabold tracking-tighter">
            <Amount minor={worth} currency={base} countUp />
          </p>
        )}
        <ul className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          {(accounts.data ?? [])
            .filter((a) => !a.archived)
            .map((account) => (
              <li key={account.id} className="shrink-0 rounded-2xl bg-surface-2 px-3.5 py-2.5">
                <p className="text-xs font-semibold text-muted">{account.name}</p>
                <Amount
                  minor={account.balanceMinor}
                  currency={account.currency}
                  className="text-sm font-bold"
                />
              </li>
            ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => composer.open({ draft: { kind: "expense" } })}>
            <Plus aria-hidden="true" />
            {t.tx.expense}
          </Button>
          <Button variant="secondary" onClick={() => composer.open({ draft: { kind: "income" } })}>
            {t.tx.income}
          </Button>
          <Button
            variant="secondary"
            onClick={() => composer.open({ draft: { kind: "transfer" } })}
          >
            {t.tx.transfer}
          </Button>
        </div>
      </Card>
    ),

    cashflow: (
      <Card key="cashflow" className="md:col-span-2" aria-labelledby="w-cashflow">
        <CardHeader id="w-cashflow" title={t.dashboard.cashflow} />
        <dl className="grid grid-cols-3 gap-3">
          {[
            {
              label: t.dashboard.income,
              minor: now.income,
              ratio: change(now.income, then.income),
              good: "up" as const,
            },
            {
              label: t.dashboard.expenses,
              minor: now.expenses,
              ratio: change(now.expenses, then.expenses),
              good: "down" as const,
            },
            { label: t.dashboard.net, minor: now.net, ratio: null, good: "up" as const },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-xs font-semibold text-muted">{item.label}</dt>
              <dd className="mt-1 flex flex-col gap-1">
                <Amount
                  minor={item.minor}
                  currency={base}
                  compact={item.minor >= 10_000_000}
                  className="text-lg font-extrabold tracking-tight sm:text-xl"
                  countUp
                />
                <Delta ratio={item.ratio} good={item.good} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <Suspense fallback={<Skeleton className="h-44 w-full" />}>
            <Charts.Cashflow
              data={cashflowSeries(current.data ?? [], range.from, range.to, base, mids)}
              currency={base}
            />
          </Suspense>
        </div>
      </Card>
    ),

    spending: (
      <Card key="spending" aria-labelledby="w-spending">
        <CardHeader id="w-spending" title={t.dashboard.spending} />
        {spending.length === 0 ? (
          <EmptyState icon={<Inbox />} title={t.dashboard.noSpending} />
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <Suspense fallback={<Skeleton className="size-40 rounded-full" />}>
              <Charts.Donut
                data={spending.map((s) => ({
                  id: s.categoryId,
                  minor: s.minor,
                  colour: colourVar(categories.get(s.categoryId)?.colour ?? "slate"),
                }))}
              />
            </Suspense>
            <ul className="w-full min-w-0 flex-1 space-y-2.5">
              {spending.map((s) => {
                const category = categories.get(s.categoryId);
                return (
                  <li key={s.categoryId} className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: colourVar(category?.colour ?? "slate") }}
                    />
                    <Link
                      to="/transactions"
                      search={{
                        period,
                        category: s.categoryId === "none" ? undefined : s.categoryId,
                        kind: "expense",
                      }}
                      className="min-w-0 flex-1 truncate font-semibold hover:underline"
                    >
                      {category?.name ?? t.tx.noCategory}
                    </Link>
                    <span className="tabular text-xs text-muted">
                      {percent(s.minor / spendingTotal, locale).replace("+", "")}
                    </span>
                    <Amount minor={s.minor} currency={base} className="font-bold" />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>
    ),

    budgets: (
      <Card key="budgets" aria-labelledby="w-budgets">
        <CardHeader
          id="w-budgets"
          title={t.dashboard.budgets}
          description={`${formatDay(month.from, locale)} – ${formatDay(month.to, locale)}`}
          action={
            <Link to="/budgets" className={buttonStyles({ variant: "ghost", size: "sm" })}>
              {t.dashboard.seeAll}
            </Link>
          }
        />
        {progress.length === 0 ? (
          <EmptyState illustration={onboardingBudgets} compact title={t.budgets.empty} />
        ) : (
          <ul className="space-y-4">
            {progress.slice(0, 4).map((p) => {
              const category = categories.get(p.budget.categoryId);
              return (
                <li key={p.budget.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{category?.name}</span>
                    <span className="text-xs text-muted">
                      <Amount minor={p.spent} currency={p.budget.currency} /> /{" "}
                      <Amount minor={p.limit} currency={p.budget.currency} />
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={category?.name}
                    aria-valuemin={0}
                    aria-valuemax={p.limit}
                    aria-valuenow={Math.min(p.spent, p.limit)}
                    className="h-2.5 overflow-hidden rounded-full bg-surface-2"
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700 ease-out",
                        p.state === "over"
                          ? "bg-negative"
                          : p.state === "warning"
                            ? "bg-warning"
                            : "bg-accent",
                      )}
                      style={{ width: `${Math.min(100, p.ratio * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    ),

    recent: (
      <Card key="recent" aria-labelledby="w-recent">
        <CardHeader
          id="w-recent"
          title={t.dashboard.recent}
          action={
            <Link
              to="/transactions"
              search={{ period }}
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              {t.dashboard.seeAll}
              <ArrowRight aria-hidden="true" />
            </Link>
          }
        />
        {current.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (current.data ?? []).length === 0 ? (
          <EmptyState icon={<Inbox />} title={t.tx.empty} hint={t.tx.emptyHint} />
        ) : (
          <ul className="-mx-2">
            {(current.data ?? []).slice(0, 6).map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}
      </Card>
    ),

    rates: (
      <Card key="rates" aria-labelledby="w-rates">
        <CardHeader
          id="w-rates"
          title={t.dashboard.rates}
          description={
            ratesTable
              ? `${ratesTable.fallback ? "EBC" : "NBP"} · ${formatDay(ratesTable.date, locale)}`
              : undefined
          }
          action={
            <Link to="/currencies" className={buttonStyles({ variant: "ghost", size: "sm" })}>
              {t.dashboard.seeAll}
            </Link>
          }
        />
        <ul className="grid grid-cols-2 gap-2">
          {["EUR", "USD", "GBP", "CHF"].map((code) => (
            <li key={code}>
              <Link
                to="/currencies"
                search={{ code }}
                className="block rounded-2xl bg-surface-2 px-3.5 py-3 transition-colors hover:bg-border"
              >
                <span className="text-xs font-bold text-muted">{code}</span>
                <span className="tabular block text-lg font-extrabold">
                  {mids[code]?.toLocaleString(locale === "pl" ? "pl-PL" : "en-GB", {
                    minimumFractionDigits: 4,
                  }) ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    ),

    goals: (
      <Card key="goals" aria-labelledby="w-goals">
        <CardHeader
          id="w-goals"
          title={t.goals.widget}
          action={
            <Link to="/goals" className={buttonStyles({ variant: "ghost", size: "sm" })}>
              {t.dashboard.seeAll}
            </Link>
          }
        />
        {goals.length === 0 ? (
          <EmptyState illustration={onboardingGoals} compact title={t.goals.empty} />
        ) : (
          <ul className="space-y-3">
            {goals.slice(0, 3).map((goal) => {
              const pace = goalPace(goal);
              return (
                <li key={goal.id}>
                  <Link
                    to="/goals"
                    className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-surface-2"
                  >
                    <ProgressRing
                      ratio={pace.ratio}
                      colour={colourVar(goal.colour)}
                      size={48}
                      stroke={6}
                    >
                      <span className="text-[11px] font-bold">
                        {new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB", {
                          style: "percent",
                          maximumFractionDigits: 0,
                        }).format(Math.min(pace.ratio, 9.99))}
                      </span>
                    </ProgressRing>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{goal.name}</span>
                      <span className="block text-xs text-muted">
                        <Amount minor={goal.savedMinor} currency={goal.currency} /> /{" "}
                        <Amount minor={goal.targetMinor} currency={goal.currency} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    ),

    upcoming: null,
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="sr-only">{t.dashboard.title}</h1>
        <PeriodSwitch
          value={period}
          onChange={(next) => void navigate({ search: (old) => ({ ...old, period: next }) })}
        />
      </div>
      <PaletteTip />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {profile.widgets.map((key) => widgets[key])}
      </div>
    </>
  );
}
