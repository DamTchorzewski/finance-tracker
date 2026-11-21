import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowDownUp, Star, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { Card, CardHeader, Skeleton } from "@/components/ui/card.tsx";
import { Field, Input, Segmented, Select } from "@/components/ui/field.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useCashRates, useRateHistory, useRates } from "@/data/queries.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import { addDays, formatDay, today } from "@/lib/dates.ts";
import { convertMinor, formatMoney, parseAmount } from "@/lib/money.ts";
import { PageHeader } from "../shared.tsx";

const HistoryChart = lazy(() => import("./history-chart.tsx"));

const FAVOURITES_KEY = "ft-favourite-currencies";
const loadFavourites = (): string[] => {
  try {
    return (
      (JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? "null") as string[] | null) ?? [
        "EUR",
        "USD",
        "GBP",
        "CHF",
      ]
    );
  } catch {
    return ["EUR", "USD", "GBP", "CHF"];
  }
};

const names = (locale: string) =>
  new Intl.DisplayNames([locale === "pl" ? "pl" : "en"], { type: "currency" });

export default function CurrenciesPage() {
  const { t, locale, fill } = useI18n();
  const search = useSearch({ from: "/app/currencies" });
  const navigate = useNavigate({ from: "/currencies" });
  const mid = useRates();
  const cash = useCashRates();
  const code = search.code ?? "EUR";
  const [days, setDays] = useState<"30" | "90" | "365">("90");
  const history = useRateHistory(code, addDays(today(), -Number(days)), today());
  const [favourites, setFavourites] = useState(loadFavourites);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("PLN");
  const display = useMemo(() => names(locale), [locale]);
  const number = (value: number, digits = 4) =>
    value.toLocaleString(locale === "pl" ? "pl-PL" : "en-GB", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  const rates = mid.data?.rates ?? {};
  const codes = ["PLN", ...Object.keys(rates).sort()];
  const midOf = (c: string) => (c === "PLN" ? 1 : rates[c]);

  const toggleFavourite = (c: string) => {
    const next = favourites.includes(c) ? favourites.filter((f) => f !== c) : [...favourites, c];
    setFavourites(next);
    try {
      localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
    } catch {
      // kept for this visit
    }
  };

  const amountMinor = parseAmount(amount, from);
  const fromMid = midOf(from);
  const toMid = midOf(to);
  const result =
    amountMinor !== null && fromMid && toMid
      ? convertMinor(amountMinor, { code: from, mid: fromMid }, { code: to, mid: toMid })
      : null;

  const points = history.data?.points ?? [];
  const first = points[0]?.mid;
  const last = points.at(-1)?.mid;
  const trend = first && last ? (last - first) / first : null;

  const sorted = [...Object.entries(rates)].sort(([a], [b]) => {
    const fa = favourites.includes(a) ? 0 : 1;
    const fb = favourites.includes(b) ? 0 : 1;
    return fa - fb || a.localeCompare(b);
  });

  return (
    <>
      <PageHeader title={t.currencies.title} />
      {mid.data && (
        <p
          className={cn(
            "-mt-3 mb-5 flex items-center gap-1.5 text-sm",
            mid.data.fallback ? "font-semibold text-warning" : "text-muted",
          )}
        >
          {mid.data.fallback && <TriangleAlert aria-hidden="true" className="size-4" />}
          {fill(mid.data.fallback ? t.currencies.fallback : t.currencies.table, {
            date: formatDay(mid.data.date, locale, "long"),
          })}
        </p>
      )}
      {mid.isError && (
        <p className="mb-5 text-sm font-semibold text-negative">{t.currencies.unavailable}</p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card aria-labelledby="converter">
          <CardHeader id="converter" title={t.currencies.converter} />
          <div className="flex flex-col gap-4">
            <Field label={t.tx.amount}>
              {(props) => (
                <Input
                  {...props}
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="tabular h-14 text-2xl font-extrabold"
                />
              )}
            </Field>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Field label={t.currencies.from}>
                {(props) => (
                  <Select {...props} value={from} onChange={(event) => setFrom(event.target.value)}>
                    {codes.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button
                variant="secondary"
                size="icon"
                aria-label={`${t.currencies.from} ↔ ${t.currencies.to}`}
                onClick={() => {
                  setFrom(to);
                  setTo(from);
                }}
              >
                <ArrowDownUp aria-hidden="true" className="rotate-90" />
              </Button>
              <Field label={t.currencies.to}>
                {(props) => (
                  <Select {...props} value={to} onChange={(event) => setTo(event.target.value)}>
                    {codes.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <output aria-live="polite" className="rounded-2xl bg-accent-soft px-4 py-4">
              <span className="block text-xs font-semibold text-muted">{t.currencies.mid}</span>
              <span className="amount tabular block text-3xl font-extrabold tracking-tight">
                {result === null ? "—" : formatMoney(result, to, locale)}
              </span>
              {fromMid && toMid && (
                <span className="tabular mt-1 block text-xs text-muted">
                  1 {from} = {number(fromMid / toMid)} {to}
                </span>
              )}
            </output>
          </div>
        </Card>

        <Card aria-labelledby="history">
          <CardHeader
            id="history"
            title={fill(t.currencies.history, { code })}
            description={
              trend === null
                ? undefined
                : `${trend >= 0 ? "▲" : "▼"} ${number(Math.abs(trend) * 100, 2)} %`
            }
            action={
              <Select
                aria-label={t.accounts.currency}
                value={code}
                onChange={(event) => void navigate({ search: { code: event.target.value } })}
                className="h-10 w-28"
              >
                {codes
                  .filter((c) => c !== "PLN")
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </Select>
            }
          />
          <Segmented
            label={t.period.label}
            value={days}
            onChange={setDays}
            options={[
              { value: "30", label: t.period["30d"] },
              { value: "90", label: t.period["90d"] },
              { value: "365", label: t.period.year },
            ]}
            className="mb-3"
          />
          {history.isPending ? (
            <Skeleton className="h-56" />
          ) : (
            <Suspense fallback={<Skeleton className="h-56" />}>
              <HistoryChart points={points} />
            </Suspense>
          )}
          {points.length > 0 && (
            <p className="tabular mt-2 text-xs text-muted">
              {formatDay(points[0]!.date, locale)}: {number(first!)} PLN →{" "}
              {formatDay(points.at(-1)!.date, locale)}: {number(last!)} PLN
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card aria-labelledby="table-a">
          <CardHeader id="table-a" title={t.currencies.mid} description={t.currencies.favourites} />
          {mid.isPending ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="-mx-1 max-h-[28rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-1 py-2 font-semibold">
                      <span className="sr-only">{t.currencies.favourites}</span>
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      {t.accounts.currency}
                    </th>
                    <th scope="col" className="py-2 text-right font-semibold">
                      PLN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(([c, value]) => (
                    <tr key={c} className="border-t border-border">
                      <td className="w-10 px-1 py-1">
                        <button
                          type="button"
                          aria-pressed={favourites.includes(c)}
                          aria-label={`${t.currencies.favourites}: ${c}`}
                          onClick={() => toggleFavourite(c)}
                          className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 aria-pressed:text-warning"
                        >
                          <Star
                            aria-hidden="true"
                            className={cn("size-4", favourites.includes(c) && "fill-current")}
                          />
                        </button>
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => void navigate({ search: { code: c } })}
                          className="text-left hover:underline"
                        >
                          <span className="font-bold">{c}</span>{" "}
                          <span className="text-muted">{display.of(c)}</span>
                        </button>
                      </td>
                      <td className="tabular py-2 text-right font-semibold">{number(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card aria-labelledby="table-c">
          <CardHeader
            id="table-c"
            title={t.currencies.cash}
            description={cash.data ? formatDay(cash.data.date, locale, "long") : undefined}
          />
          {cash.isPending ? (
            <Skeleton className="h-64" />
          ) : cash.isError ? (
            <p className="text-sm text-muted">{t.currencies.unavailable}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="py-2 font-semibold">
                    {t.accounts.currency}
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    {t.currencies.buy}
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    {t.currencies.sell}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cash.data?.rates ?? {}).map(([c, { bid, ask }]) => (
                  <tr key={c} className="border-t border-border">
                    <th scope="row" className="py-2 text-left font-bold">
                      {c}
                    </th>
                    <td className="tabular py-2 text-right">{number(bid)}</td>
                    <td className="tabular py-2 text-right">{number(ask)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
