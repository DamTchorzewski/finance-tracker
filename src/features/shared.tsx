import { ArrowLeftRight } from "lucide-react";
import { createElement, useMemo } from "react";
import { useComposer } from "@/app/composer.tsx";
import { Amount } from "@/components/ui/amount.tsx";
import { Segmented } from "@/components/ui/field.tsx";
import { useAccounts, useCategories, useMe, useRates } from "@/data/queries.ts";
import type { Category, Profile, Transaction } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { PERIODS, type PeriodKey } from "@/lib/dates.ts";
import { colourVar, iconFor } from "@/lib/icons.ts";
import type { Mids } from "@/lib/stats.ts";
import { DEMO_RATES } from "@/data/seed.ts";

const FALLBACK_PROFILE: Profile = {
  displayName: null,
  baseCurrency: "PLN",
  locale: "pl",
  monthStartDay: 1,
  theme: "system",
  accentHue: 328,
  privacyMode: false,
  widgets: ["balance", "cashflow", "spending", "budgets", "recent", "rates"],
};

/** The profile, its base currency and today's mid rates (the demo's own rates when the API cannot be reached). */
export function useBase() {
  const me = useMe();
  const rates = useRates();
  const profile = me.data?.profile ?? FALLBACK_PROFILE;
  const mids: Mids = rates.data?.rates ?? DEMO_RATES;
  return {
    profile,
    base: profile.baseCurrency,
    mids,
    ratesTable: rates.data,
    loading: me.isPending,
  };
}

export function useCategoryMap() {
  const { data } = useCategories();
  return useMemo(() => new Map((data ?? []).map((c) => [c.id, c])), [data]);
}

export function useAccountMap() {
  const { data } = useAccounts();
  return useMemo(() => new Map((data ?? []).map((a) => [a.id, a])), [data]);
}

export function CategoryBadge({
  category,
  size = "md",
}: {
  category?: Category;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden="true"
      className={
        size === "sm"
          ? "grid size-8 shrink-0 place-items-center rounded-xl text-white"
          : "grid size-10 shrink-0 place-items-center rounded-2xl text-white"
      }
      style={{ background: category ? colourVar(category.colour) : "var(--cat-slate)" }}
    >
      {createElement(category ? iconFor(category.icon) : ArrowLeftRight, {
        className: size === "sm" ? "size-4" : "size-[18px]",
      })}
    </span>
  );
}

/** One transaction in a list: what, where, how much. Opens the form on click. */
export function TransactionRow({ tx, as: Tag = "li" }: { tx: Transaction; as?: "li" | "div" }) {
  const { t } = useI18n();
  const composer = useComposer();
  const categories = useCategoryMap();
  const accounts = useAccountMap();
  const category = tx.categoryId ? categories.get(tx.categoryId) : undefined;
  const account = accounts.get(tx.accountId);
  const to = tx.toAccountId ? accounts.get(tx.toAccountId) : undefined;
  const title =
    tx.note ||
    tx.payee ||
    (tx.kind === "transfer"
      ? `${account?.name ?? ""} → ${to?.name ?? ""}`
      : (category?.name ?? t.tx.noCategory));
  const subtitle = [
    tx.kind === "transfer" ? t.tx.transfer : (category?.name ?? t.tx.noCategory),
    account?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Tag>
      <button
        type="button"
        onClick={() => composer.open({ edit: tx })}
        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
      >
        <CategoryBadge category={category} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="block truncate text-xs text-muted">{subtitle}</span>
        </span>
        <Amount
          minor={tx.kind === "expense" ? -tx.amountMinor : tx.amountMinor}
          currency={tx.currency}
          signed={tx.kind !== "transfer"}
          tone={tx.kind === "income" ? "positive" : undefined}
          className="text-sm font-bold"
        />
      </button>
    </Tag>
  );
}

export function PeriodSwitch({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
}) {
  const { t } = useI18n();
  return (
    <Segmented
      label={t.period.label}
      value={value}
      onChange={onChange}
      options={PERIODS.map((period) => ({ value: period, label: t.period[period] }))}
    />
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight font-extrabold tracking-tight">
        {title}
      </h1>
      {children}
    </div>
  );
}
