import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { useEffect } from "react";
import { Amount } from "@/components/ui/amount.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/card.tsx";
import { useAccounts, useBudgets, useMe, useTransactions } from "@/data/queries.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { addDays, addMonths, formatDay, payMonth, previousRange, today } from "@/lib/dates.ts";
import { colourVar } from "@/lib/icons.ts";
import { baseValue, budgetProgress, byCategory, change, netWorth, totals } from "@/lib/stats.ts";
import { useAccountMap, useBase, useCategoryMap } from "../shared.tsx";

/** "2026-11" → the pay month that starts in that calendar month; nothing → the current pay month. */
function reportRange(month: string | undefined, startDay: number) {
  if (!month) return payMonth(today(), startDay);
  return payMonth(`${month}-${String(startDay).padStart(2, "0")}`, startDay);
}

/**
 * The monthly report, laid out for an A4 page. "Download PDF" opens the print window of the browser, where "Save as
 * PDF" writes the file; the page title becomes the file name. Fonts, Polish letters and the layout come out exactly as
 * on the screen, with no PDF library in the app.
 */
export default function ReportPage() {
  const { t, locale, fill } = useI18n();
  const search = useSearch({ from: "/app/report" });
  const navigate = useNavigate({ from: "/report" });
  const { profile, base, mids, ratesTable } = useBase();
  const me = useMe().data;
  const range = reportRange(search.month, profile.monthStartDay);
  const before = previousRange(range);
  const current = useTransactions(range);
  const previous = useTransactions(before);
  const accounts = useAccounts().data ?? [];
  const budgets = useBudgets().data ?? [];
  const categories = useCategoryMap();
  const accountMap = useAccountMap();
  const items = current.data ?? [];

  const now = totals(items, base, mids);
  const then = totals(previous.data ?? [], base, mids);
  const saved = now.income > 0 ? now.net / now.income : null;
  const spending = byCategory(items, base, mids);
  const spentTotal = spending.reduce((sum, s) => sum + s.minor, 0);
  const spentBefore = new Map(
    byCategory(previous.data ?? [], base, mids).map((s) => [s.categoryId, s.minor]),
  );
  const progress = budgetProgress(budgets, items, mids);
  const largest = items
    .filter((tx) => tx.kind === "expense")
    .sort((a, b) => baseValue(b, base, mids) - baseValue(a, base, mids))
    .slice(0, 8);
  const percent = (ratio: number, signed = false) =>
    new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB", {
      style: "percent",
      maximumFractionDigits: 0,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(ratio);

  const monthKey = range.from.slice(0, 7);
  const step = (by: -1 | 1) =>
    void navigate({ search: { month: addMonths(range.from, by).slice(0, 7) } });

  // the title of the page is the name of the saved PDF file
  useEffect(() => {
    const title = document.title;
    document.title = `${t.report.fileName}-${monthKey}`;
    return () => {
      document.title = title;
    };
  }, [monthKey, t.report.fileName]);

  const period = `${formatDay(range.from, locale, "long")} – ${formatDay(range.to, locale, "long")}`;

  return (
    <article className="report mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.report.previous}
            onClick={() => step(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-40 text-center text-sm font-semibold">{period}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.report.next}
            disabled={addDays(range.to, 1) > today()}
            onClick={() => step(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => window.print()}>
            <FileDown aria-hidden="true" />
            {t.report.download}
          </Button>
          <p className="text-xs text-muted">{t.report.printHint}</p>
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-accent uppercase">{t.appName}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{t.report.title}</h1>
            <p className="mt-1 text-muted">{period}</p>
          </div>
          <div className="text-right text-xs text-muted">
            {(profile.displayName ?? me?.user.name) && (
              <p className="font-semibold text-foreground">
                {profile.displayName ?? me?.user.name}
              </p>
            )}
            <p>{fill(t.report.generated, { date: formatDay(today(), locale, "long") })}</p>
            <p>{fill(t.report.currency, { code: base })}</p>
          </div>
        </header>

        {current.isPending ? (
          <Skeleton className="mt-6 h-64" />
        ) : (
          <>
            <section aria-labelledby="r-summary" className="mt-6 break-inside-avoid">
              <h2 id="r-summary" className="sr-only">
                {t.report.summary}
              </h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: t.dashboard.income,
                    minor: now.income,
                    delta: change(now.income, then.income),
                  },
                  {
                    label: t.dashboard.expenses,
                    minor: now.expenses,
                    delta: change(now.expenses, then.expenses),
                  },
                  { label: t.dashboard.net, minor: now.net, delta: null },
                  {
                    label: t.dashboard.balance,
                    minor: netWorth(accounts, base, mids),
                    delta: null,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-surface-2 p-3.5 print:border print:border-border print:bg-transparent"
                  >
                    <dt className="text-xs font-semibold text-muted">{item.label}</dt>
                    <dd className="mt-1">
                      <Amount
                        minor={item.minor}
                        currency={base}
                        className="text-lg font-extrabold"
                      />
                      {item.delta !== null && (
                        <span className="block text-xs text-muted">
                          {percent(item.delta, true)} {t.report.vsPrevious}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {saved !== null && (
                <p className="mt-3 text-sm">
                  {fill(saved >= 0 ? t.report.savedShare : t.report.overspent, {
                    percent: percent(Math.abs(saved)),
                  })}
                </p>
              )}
            </section>

            <section aria-labelledby="r-categories" className="mt-8 break-inside-avoid">
              <h2 id="r-categories" className="mb-3 text-lg font-bold">
                {t.dashboard.spending}
              </h2>
              {spending.length === 0 ? (
                <p className="text-sm text-muted">{t.dashboard.noSpending}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr>
                      <th scope="col" className="py-1.5 font-semibold">
                        {t.tx.category}
                      </th>
                      <th scope="col" className="w-2/5 py-1.5 font-semibold">
                        <span className="sr-only">{t.report.share}</span>
                      </th>
                      <th scope="col" className="py-1.5 text-right font-semibold">
                        {t.report.share}
                      </th>
                      <th scope="col" className="py-1.5 text-right font-semibold">
                        {t.report.vsPrevious}
                      </th>
                      <th scope="col" className="py-1.5 text-right font-semibold">
                        {t.tx.amount}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {spending.map((s) => {
                      const category = categories.get(s.categoryId);
                      const before = spentBefore.get(s.categoryId) ?? 0;
                      const delta = change(s.minor, before);
                      return (
                        <tr
                          key={s.categoryId}
                          className="break-inside-avoid border-t border-border"
                        >
                          <th scope="row" className="py-2 text-left font-semibold">
                            <span
                              aria-hidden="true"
                              className="mr-2 inline-block size-2.5 rounded-full align-middle"
                              style={{ background: colourVar(category?.colour ?? "slate") }}
                            />
                            {category?.name ?? t.tx.noCategory}
                          </th>
                          <td className="py-2" aria-hidden="true">
                            <span className="block h-2 overflow-hidden rounded-full bg-surface-2 print:border print:border-border">
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${(s.minor / spentTotal) * 100}%`,
                                  background: colourVar(category?.colour ?? "slate"),
                                }}
                              />
                            </span>
                          </td>
                          <td className="tabular py-2 text-right">
                            {percent(s.minor / spentTotal)}
                          </td>
                          <td className="tabular py-2 pl-3 text-right text-muted">
                            {delta === null ? "—" : percent(delta, true)}
                          </td>
                          <td className="py-2 pl-3 text-right font-semibold whitespace-nowrap">
                            <Amount minor={s.minor} currency={base} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>

            {progress.length > 0 && (
              <section aria-labelledby="r-budgets" className="mt-8 break-inside-avoid">
                <h2 id="r-budgets" className="mb-3 text-lg font-bold">
                  {t.budgets.title}
                </h2>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr>
                      <th scope="col" className="py-1.5 font-semibold">
                        {t.tx.category}
                      </th>
                      <th scope="col" className="py-1.5 text-right font-semibold">
                        {t.budgets.limit}
                      </th>
                      <th scope="col" className="py-1.5 text-right font-semibold">
                        {t.dashboard.expenses}
                      </th>
                      <th scope="col" className="py-1.5 text-right font-semibold">
                        {t.report.result}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((p) => (
                      <tr key={p.budget.id} className="border-t border-border">
                        <th scope="row" className="py-2 text-left font-semibold">
                          {categories.get(p.budget.categoryId)?.name}
                        </th>
                        <td className="py-2 text-right">
                          <Amount minor={p.limit} currency={p.budget.currency} />
                        </td>
                        <td className="py-2 text-right">
                          <Amount minor={p.spent} currency={p.budget.currency} />
                        </td>
                        <td
                          className={
                            p.state === "over"
                              ? "py-2 text-right font-semibold text-negative"
                              : "py-2 text-right font-semibold text-positive"
                          }
                        >
                          {p.state === "over" ? t.report.over : t.report.within} ({percent(p.ratio)}
                          )
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {largest.length > 0 && (
              <section aria-labelledby="r-largest" className="mt-8 break-inside-avoid">
                <h2 id="r-largest" className="mb-3 text-lg font-bold">
                  {t.report.largest}
                </h2>
                <ol className="space-y-1.5 text-sm">
                  {largest.map((tx, index) => (
                    <li key={tx.id} className="flex items-baseline gap-3">
                      <span className="tabular w-5 text-muted">{index + 1}.</span>
                      <span className="min-w-0 flex-1 truncate">
                        {tx.note || tx.payee || categories.get(tx.categoryId ?? "")?.name}{" "}
                        <span className="text-muted">· {formatDay(tx.date, locale)}</span>
                      </span>
                      <Amount
                        minor={tx.amountMinor}
                        currency={tx.currency}
                        className="font-semibold"
                      />
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section aria-labelledby="r-all" className="mt-8 print:break-before-page">
              <h2 id="r-all" className="mb-3 text-lg font-bold">
                {t.report.all} ({items.length})
              </h2>
              <table className="w-full text-xs sm:text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="py-1.5 pr-2 font-semibold">
                      {t.tx.date}
                    </th>
                    <th scope="col" className="py-1.5 pr-2 font-semibold">
                      {t.tx.note}
                    </th>
                    <th
                      scope="col"
                      className="py-1.5 pr-2 font-semibold max-sm:hidden print:table-cell"
                    >
                      {t.tx.category}
                    </th>
                    <th
                      scope="col"
                      className="py-1.5 pr-2 font-semibold max-sm:hidden print:table-cell"
                    >
                      {t.tx.account}
                    </th>
                    <th scope="col" className="py-1.5 text-right font-semibold">
                      {t.tx.amount}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((tx) => (
                    <tr key={tx.id} className="break-inside-avoid border-t border-border">
                      <td className="tabular py-1.5 pr-2 whitespace-nowrap">
                        {formatDay(tx.date, locale)}
                      </td>
                      <td className="py-1.5 pr-2">{tx.note || tx.payee || "—"}</td>
                      <td className="py-1.5 pr-2 max-sm:hidden print:table-cell">
                        {tx.kind === "transfer"
                          ? t.tx.transfer
                          : (categories.get(tx.categoryId ?? "")?.name ?? t.tx.noCategory)}
                      </td>
                      <td className="py-1.5 pr-2 max-sm:hidden print:table-cell">
                        {accountMap.get(tx.accountId)?.name}
                      </td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <Amount
                          minor={tx.kind === "expense" ? -tx.amountMinor : tx.amountMinor}
                          currency={tx.currency}
                          signed={tx.kind !== "transfer"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <footer className="mt-8 border-t border-border pt-3 text-xs text-muted">
              {ratesTable
                ? fill(t.report.ratesNote, { date: formatDay(ratesTable.date, locale, "long") })
                : t.report.ratesDemo}
            </footer>
          </>
        )}
      </div>
    </article>
  );
}
