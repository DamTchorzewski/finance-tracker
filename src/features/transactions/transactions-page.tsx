import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { FileText, Plus, Search } from "lucide-react";
import emptyTransactions from "@/assets/illustrations/empty-transactions.svg?raw";
import nothingFound from "@/assets/illustrations/nothing-found.svg?raw";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useComposer } from "@/app/composer.tsx";
import { Amount } from "@/components/ui/amount.tsx";
import { Button, buttonStyles } from "@/components/ui/button.tsx";
import { Card, EmptyState, Skeleton } from "@/components/ui/card.tsx";
import { Input, Select } from "@/components/ui/field.tsx";
import { useAccounts, useCategories, useTransactions } from "@/data/queries.ts";
import type { Transaction } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { addDays, formatDay, periodRange, today } from "@/lib/dates.ts";
import { totals } from "@/lib/stats.ts";
import { PageHeader, PeriodSwitch, TransactionRow, useBase } from "../shared.tsx";

type Row =
  { type: "day"; day: string; net: number; currency: string } | { type: "tx"; tx: Transaction };

export default function TransactionsPage() {
  const { t, locale, plural } = useI18n();
  const search = useSearch({ from: "/app/transactions" });
  const navigate = useNavigate({ from: "/transactions" });
  const composer = useComposer();
  const { profile, base, mids } = useBase();
  const accounts = useAccounts().data ?? [];
  const categories = useCategories().data ?? [];
  const period = search.period ?? "month";
  const range = periodRange(period, profile.monthStartDay);

  // the search box waits 250 ms after typing before it asks again (performance.md)
  const [text, setText] = useState(search.q ?? "");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((search.q ?? "") !== text)
        void navigate({ search: (old) => ({ ...old, q: text || undefined }), replace: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text, search.q, navigate]);

  const query = useTransactions({
    ...range,
    accountId: search.account,
    categoryId: search.category,
    kind: search.kind,
    q: search.q,
  });
  const items = useMemo(() => query.data ?? [], [query.data]);
  const sums = totals(items, base, mids);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let day = "";
    for (const tx of items) {
      if (tx.date !== day) {
        day = tx.date;
        const net = totals(
          items.filter((i) => i.date === day),
          base,
          mids,
        ).net;
        out.push({ type: "day", day, net, currency: base });
      }
      out.push({ type: "tx", tx });
    }
    return out;
  }, [items, base, mids]);

  // the list's distance from the top of the page, measured when it mounts (the virtualizer scrolls the window)
  const [scrollMargin, setScrollMargin] = useState(0);
  const listRef = useCallback((node: HTMLUListElement | null) => {
    if (node) setScrollMargin(node.getBoundingClientRect().top + window.scrollY);
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (index) => (rows[index]?.type === "day" ? 40 : 64),
    overscan: 10,
    scrollMargin,
  });

  const dayLabel = (day: string) =>
    day === today()
      ? t.tx.today
      : day === addDays(today(), -1)
        ? t.tx.yesterday
        : formatDay(day, locale, "weekday");

  const setFilter = (key: "account" | "category" | "kind", value: string) =>
    void navigate({ search: (old) => ({ ...old, [key]: value || undefined }) });

  const filtered = Boolean(search.account || search.category || search.kind || search.q);

  return (
    <>
      <PageHeader title={t.tx.title}>
        <div className="flex gap-2">
          <Link to="/report" className={buttonStyles({ variant: "secondary" })}>
            <FileText aria-hidden="true" />
            {t.report.download}
          </Link>
          <Button onClick={() => composer.open()} className="max-md:hidden">
            <Plus aria-hidden="true" />
            {t.tx.new}
          </Button>
        </div>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3">
        <PeriodSwitch
          value={period}
          onChange={(next) => void navigate({ search: (old) => ({ ...old, period: next }) })}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">{t.tx.search}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted"
            />
            <Input
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t.tx.search}
              className="pl-10"
            />
          </label>
          <Select
            aria-label={t.tx.account}
            value={search.account ?? ""}
            onChange={(event) => setFilter("account", event.target.value)}
          >
            <option value="">{t.tx.allAccounts}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t.tx.category}
            value={search.category ?? ""}
            onChange={(event) => setFilter("category", event.target.value)}
          >
            <option value="">{t.tx.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t.tx.filters}
            value={search.kind ?? ""}
            onChange={(event) => setFilter("kind", event.target.value)}
          >
            <option value="">{t.tx.allKinds}</option>
            <option value="expense">{t.tx.expense}</option>
            <option value="income">{t.tx.income}</option>
            <option value="transfer">{t.tx.transfer}</option>
          </Select>
        </div>
      </div>

      <Card className="p-2 sm:p-3">
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-2 text-xs font-semibold text-muted"
        >
          <span>{plural(t.tx.count, items.length)}</span>
          <span>
            {t.dashboard.income}:{" "}
            <Amount minor={sums.income} currency={base} className="text-positive" />
          </span>
          <span>
            {t.dashboard.expenses}: <Amount minor={sums.expenses} currency={base} />
          </span>
        </div>

        {query.isPending ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : items.length === 0 ? (
          filtered ? (
            <EmptyState illustration={nothingFound} title={t.tx.nothingFound} />
          ) : (
            <EmptyState
              illustration={emptyTransactions}
              title={t.tx.empty}
              hint={t.tx.emptyHint}
              action={
                <Button onClick={() => composer.open()}>
                  <Plus aria-hidden="true" />
                  {t.tx.new}
                </Button>
              }
            />
          )
        ) : (
          <ul ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index];
              if (!row) return null;
              return (
                <li
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute inset-x-0 top-0"
                  style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
                >
                  {row.type === "day" ? (
                    <h2 className="flex items-center justify-between px-2 pt-3 pb-1 text-xs font-bold tracking-wide text-muted uppercase first:pt-1">
                      <span>{dayLabel(row.day)}</span>
                      <Amount
                        minor={row.net}
                        currency={row.currency}
                        signed
                        className="normal-case"
                      />
                    </h2>
                  ) : (
                    <TransactionRow tx={row.tx} as="div" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
