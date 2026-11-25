import { AlertTriangle, CircleCheck, Plus } from "lucide-react";
import emptyBudgets from "@/assets/illustrations/empty-budgets.svg?raw";
import allCaughtUp from "@/assets/illustrations/all-caught-up.svg?raw";
import { Illustration } from "@/components/brand/illustration.tsx";
import { SuccessCheck } from "@/components/brand/motion.tsx";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Amount } from "@/components/ui/amount.tsx";
import { BudgetMeter } from "@/components/ui/budget-meter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, EmptyState, Skeleton } from "@/components/ui/card.tsx";
import { Field, Input, Select, Switch } from "@/components/ui/field.tsx";
import { FormFooter } from "@/components/ui/form-footer.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import { useBudgetMutations, useBudgets, useCategories, useTransactions } from "@/data/queries.ts";
import { DataError, type Budget } from "@/data/types.ts";
import { fillNode, useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDay, payMonth, today } from "@/lib/dates.ts";
import { amountInput, formatMoney, parseAmount } from "@/lib/money.ts";
import { budgetProgress } from "@/lib/stats.ts";
import { CategoryBadge, PageHeader, useBase, useCategoryMap } from "../shared.tsx";

function BudgetSheet({
  budget,
  used,
  open,
  onOpenChange,
}: {
  budget?: Budget;
  used: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { base } = useBase();
  const categories = (useCategories().data ?? []).filter(
    (c) => c.kind === "expense" && !c.archived && (!used.has(c.id) || c.id === budget?.categoryId),
  );
  const { create, update, remove } = useBudgetMutations();
  const currency = budget?.currency ?? base;
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? categories[0]?.id ?? "");
  const [limit, setLimit] = useState(
    budget ? amountInput(budget.limitMinor, currency, locale) : "",
  );
  const [rollover, setRollover] = useState(budget?.rollover ?? false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const limitMinor = parseAmount(limit, currency);
    if (!limitMinor || limitMinor <= 0) return setError(t.budgets.limit);
    try {
      if (budget) await update.mutateAsync({ id: budget.id, patch: { limitMinor, rollover } });
      else await create.mutateAsync({ categoryId, limitMinor, rollover, alertAt: [0.8, 1] });
      onOpenChange(false);
      toast.success(t.settings.saved, { icon: <SuccessCheck /> });
    } catch (err) {
      toast.error(
        err instanceof DataError && err.status === 409 ? t.budgets.exists : t.somethingWrong,
      );
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={budget ? t.edit : t.budgets.new}
      footer={
        <FormFooter
          form="budget-form"
          onCancel={() => onOpenChange(false)}
          onDelete={
            budget &&
            (async () => {
              await remove.mutateAsync(budget.id);
              onOpenChange(false);
            })
          }
        />
      }
    >
      <form
        id="budget-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        className="flex flex-col gap-4 pt-1"
      >
        <Field label={t.tx.category}>
          {(props) => (
            <Select
              {...props}
              value={categoryId}
              disabled={Boolean(budget)}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={`${t.budgets.limit} (${currency})`} error={error}>
          {(props) => (
            <Input
              {...props}
              autoFocus
              inputMode="decimal"
              placeholder="0,00"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="tabular h-14 text-2xl font-extrabold"
            />
          )}
        </Field>
        <Switch checked={rollover} onChange={setRollover} label={t.budgets.rollover} />
      </form>
    </Sheet>
  );
}

export default function BudgetsPage() {
  const { t, locale, fill } = useI18n();
  const { profile, mids } = useBase();
  const month = payMonth(today(), profile.monthStartDay);
  const budgets = useBudgets();
  const transactions = useTransactions(month);
  const categories = useCategoryMap();
  const [sheet, setSheet] = useState<{ open: boolean; budget?: Budget; key: number }>({
    open: false,
    key: 0,
  });
  const open = (budget?: Budget) => setSheet((old) => ({ open: true, budget, key: old.key + 1 }));
  const progress = budgetProgress(budgets.data ?? [], transactions.data ?? [], mids);
  const used = new Set((budgets.data ?? []).map((b) => b.categoryId));
  const percent = (ratio: number) =>
    new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB", {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(ratio);

  return (
    <>
      <PageHeader title={t.budgets.title}>
        <Button onClick={() => open()}>
          <Plus aria-hidden="true" />
          {t.budgets.new}
        </Button>
      </PageHeader>
      <p className="-mt-3 mb-5 text-sm text-muted">
        {fill(t.budgets.month, {
          from: formatDay(month.from, locale, "long"),
          to: formatDay(month.to, locale, "long"),
        })}
      </p>

      {budgets.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : progress.length === 0 ? (
        <Card>
          <EmptyState
            illustration={emptyBudgets}
            title={t.budgets.empty}
            action={<Button onClick={() => open()}>{t.budgets.new}</Button>}
          />
        </Card>
      ) : (
        <>
          {progress.every((p) => p.state !== "over" && p.state !== "warning") && (
            <Card className="mb-4 flex items-center gap-4">
              <Illustration svg={allCaughtUp} className="w-24 shrink-0 sm:w-32" />
              <div>
                <p className="font-bold">{t.budgets.allFine}</p>
                <p className="text-sm text-muted">{t.budgets.allFineHint}</p>
              </div>
            </Card>
          )}
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {progress.map((p) => {
              const category = categories.get(p.budget.categoryId);
              const left = p.limit - p.spent;
              return (
                <li key={p.budget.id}>
                  <Card className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <CategoryBadge category={category} />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-bold">{category?.name}</h2>
                        <p className="text-xs text-muted">
                          {fill(t.budgets.spent, {
                            spent: formatMoney(p.spent, p.budget.currency, locale),
                            limit: formatMoney(p.limit, p.budget.currency, locale),
                          })}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => open(p.budget)}>
                        {t.edit}
                      </Button>
                    </div>
                    <BudgetMeter
                      progress={p}
                      label={category?.name}
                      valueText={percent(p.ratio)}
                      className="h-3"
                    />
                    <p
                      className={cn(
                        "flex items-center gap-1.5 text-sm font-semibold",
                        p.state === "over"
                          ? "text-negative"
                          : p.state === "warning"
                            ? "text-warning"
                            : "text-positive",
                      )}
                    >
                      {p.state === "ok" ? (
                        <CircleCheck aria-hidden="true" className="size-4" />
                      ) : (
                        <AlertTriangle aria-hidden="true" className="size-4" />
                      )}
                      {left >= 0 ? (
                        <span>
                          {fillNode(t.budgets.left, {
                            amount: <Amount minor={left} currency={p.budget.currency} />,
                          })}{" "}
                          · {percent(p.ratio)}
                        </span>
                      ) : (
                        <span>
                          {fillNode(t.budgets.over, {
                            amount: <Amount minor={-left} currency={p.budget.currency} />,
                          })}
                        </span>
                      )}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {sheet.key > 0 && (
        <BudgetSheet
          key={sheet.key}
          budget={sheet.budget}
          used={used}
          open={sheet.open}
          onOpenChange={(next) => setSheet((old) => ({ ...old, open: next }))}
        />
      )}
    </>
  );
}
