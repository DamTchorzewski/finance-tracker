import { Plus } from "lucide-react";
import { lazy, Suspense, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { Draft } from "@/app/composer.tsx";
import { SuccessCheck } from "@/components/brand/motion.tsx";
import { Field, Input, Segmented, Select } from "@/components/ui/field.tsx";
import { FormFooter } from "@/components/ui/form-footer.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import { useAccounts, useCategories, useTransactionMutations } from "@/data/queries.ts";
import { DataError, type Transaction, type TransactionCreate, type TxKind } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import { addDays, today } from "@/lib/dates.ts";
import { colourVar, iconFor } from "@/lib/icons.ts";
import { amountInput, parseAmount } from "@/lib/money.ts";

const CategorySheet = lazy(() => import("../categories/category-sheet.tsx"));

export default function TransactionSheet({
  open,
  onOpenChange,
  draft,
  edit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft?: Draft;
  edit?: Transaction;
}) {
  const { t, locale } = useI18n();
  const accounts = (useAccounts().data ?? []).filter(
    (a) => !a.archived || a.id === edit?.accountId,
  );
  const categories = useCategories().data ?? [];
  const { create, update, remove } = useTransactionMutations();
  const amountRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<TxKind>(edit?.kind ?? draft?.kind ?? "expense");
  const [chosenAccountId, setAccountId] = useState(edit?.accountId ?? draft?.accountId ?? "");
  const [toAccountId, setToAccountId] = useState(edit?.toAccountId ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    edit?.categoryId ?? draft?.categoryId ?? null,
  );
  const [date, setDate] = useState(edit?.date ?? draft?.date ?? today());
  const [note, setNote] = useState(edit?.note ?? draft?.note ?? "");
  const [payee, setPayee] = useState(edit?.payee ?? "");
  const [tags, setTags] = useState(edit?.tags.join(", ") ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState(0);

  // the first open account is the default once the accounts are known
  const accountId = chosenAccountId || accounts[0]?.id || "";

  const account = accounts.find((a) => a.id === accountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const currency = account?.currency ?? "PLN";
  const [amount, setAmount] = useState(
    edit
      ? amountInput(edit.amountMinor, edit.currency, locale)
      : draft?.amountMinor
        ? amountInput(draft.amountMinor, "PLN", locale)
        : "",
  );
  const [toAmount, setToAmount] = useState(
    edit?.toAmountMinor && edit.toAccountId
      ? amountInput(edit.toAmountMinor, toAccount?.currency ?? "PLN", locale)
      : "",
  );

  const shownCategories = categories.filter(
    (c) => c.kind === kind && (!c.archived || c.id === categoryId),
  );

  const busy = create.isPending || update.isPending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amountMinor = parseAmount(amount, currency);
    const next: Record<string, string> = {};
    if (!amountMinor || amountMinor <= 0) next.amount = t.tx.amount;
    if (!account) next.account = t.tx.needAccount;
    if (kind === "transfer" && (!toAccount || toAccount.id === accountId))
      next.toAccount = t.tx.toAccount;
    setErrors(next);
    if (Object.keys(next).length || !amountMinor) {
      amountRef.current?.focus();
      return;
    }
    const crossCurrency = kind === "transfer" && toAccount && toAccount.currency !== currency;
    const input: TransactionCreate = {
      accountId,
      kind,
      amountMinor,
      date,
      categoryId: kind === "transfer" ? null : categoryId,
      note: note.trim(),
      payee: payee.trim() || null,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10),
      toAccountId: kind === "transfer" ? toAccountId : null,
      toAmountMinor: crossCurrency && toAmount ? parseAmount(toAmount, toAccount.currency) : null,
    };
    try {
      if (edit) await update.mutateAsync({ id: edit.id, patch: input });
      else await create.mutateAsync(input);
      toast.success(t.tx.saved, { icon: <SuccessCheck /> });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof DataError ? err.message : t.somethingWrong);
    }
  }

  async function onDelete() {
    if (!edit) return;
    const copy = edit;
    await remove.mutateAsync(copy.id);
    onOpenChange(false);
    toast(t.tx.deleted, {
      action: {
        label: t.undo,
        onClick: () =>
          void create.mutateAsync({
            accountId: copy.accountId,
            kind: copy.kind,
            amountMinor: copy.amountMinor,
            date: copy.date,
            categoryId: copy.categoryId,
            note: copy.note,
            payee: copy.payee,
            tags: copy.tags,
            toAccountId: copy.toAccountId,
            toAmountMinor: copy.toAmountMinor,
          }),
      },
    });
  }

  const quickDays = [
    { label: t.tx.today, value: today() },
    { label: t.tx.yesterday, value: addDays(today(), -1) },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={edit ? t.tx.editTitle : t.tx.new}
      footer={
        <FormFooter
          form="transaction-form"
          busy={busy}
          onCancel={() => onOpenChange(false)}
          onDelete={edit && onDelete}
        />
      }
    >
      <form
        id="transaction-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        className="flex flex-col gap-5 pt-1"
      >
        <Segmented
          label={t.tx.title}
          value={kind}
          onChange={(value) => {
            setKind(value);
            setCategoryId(null);
          }}
          options={[
            { value: "expense", label: t.tx.expense },
            { value: "income", label: t.tx.income },
            { value: "transfer", label: t.tx.transfer },
          ]}
          className="w-full [&>button]:flex-1"
        />

        <Field label={`${t.tx.amount} (${currency})`} error={errors.amount}>
          {(props) => (
            <Input
              {...props}
              ref={amountRef}
              autoFocus={!edit}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="tabular h-16 text-3xl font-extrabold tracking-tight"
            />
          )}
        </Field>

        {accounts.length === 0 ? (
          <p className="rounded-2xl bg-surface-2 p-3 text-sm font-semibold">{t.tx.needAccount}</p>
        ) : (
          <div className={cn("grid gap-4", kind === "transfer" && "sm:grid-cols-2")}>
            <Field label={t.tx.account} error={errors.account}>
              {(props) => (
                <Select
                  {...props}
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.currency}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {kind === "transfer" && (
              <Field label={t.tx.toAccount} error={errors.toAccount}>
                {(props) => (
                  <Select
                    {...props}
                    value={toAccountId}
                    onChange={(event) => setToAccountId(event.target.value)}
                  >
                    <option value="">—</option>
                    {accounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · {a.currency}
                        </option>
                      ))}
                  </Select>
                )}
              </Field>
            )}
          </div>
        )}

        {kind === "transfer" && toAccount && toAccount.currency !== currency && (
          <Field label={`${t.tx.toAmount} (${toAccount.currency})`} optional={t.optional}>
            {(props) => (
              <Input
                {...props}
                inputMode="decimal"
                value={toAmount}
                onChange={(event) => setToAmount(event.target.value)}
                className="tabular"
              />
            )}
          </Field>
        )}

        {kind !== "transfer" && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t.tx.category}</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {shownCategories.map((category) => {
                const Icon = iconFor(category.icon);
                const selected = category.id === categoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCategoryId(selected ? null : category.id)}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-2 text-center text-xs leading-tight font-semibold transition-colors",
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface hover:bg-surface-2",
                    )}
                  >
                    <span
                      className="grid size-8 place-items-center rounded-xl text-white"
                      style={{ background: colourVar(category.colour) }}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="line-clamp-2">{category.name}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setNewCategory((n) => n + 1)}
                className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-1.5 py-2 text-center text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <span className="grid size-8 place-items-center rounded-xl bg-surface-2">
                  <Plus aria-hidden="true" className="size-4" />
                </span>
                {t.categories.new}
              </button>
            </div>
          </fieldset>
        )}

        <Field label={t.tx.date}>
          {(props) => (
            <div className="flex flex-col gap-2">
              <Input
                {...props}
                type="date"
                value={date}
                max="2100-12-31"
                onChange={(event) => setDate(event.target.value || today())}
              />
              <div className="flex gap-2">
                {quickDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={date === day.value}
                    onClick={() => setDate(day.value)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold aria-pressed:border-accent aria-pressed:bg-accent-soft"
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Field>

        <Field label={t.tx.note} optional={t.optional}>
          {(props) => (
            <Input
              {...props}
              maxLength={200}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.tx.payee} optional={t.optional}>
            {(props) => (
              <Input
                {...props}
                maxLength={60}
                value={payee}
                onChange={(event) => setPayee(event.target.value)}
              />
            )}
          </Field>
          <Field label={t.tx.tags} hint={t.tx.tagsHint} optional={t.optional}>
            {(props) => (
              <Input {...props} value={tags} onChange={(event) => setTags(event.target.value)} />
            )}
          </Field>
        </div>
      </form>
      {newCategory > 0 && (
        <Suspense fallback={null}>
          <CategorySheet
            key={newCategory}
            open
            defaultKind={kind === "income" ? "income" : "expense"}
            onOpenChange={(open) => !open && setNewCategory(0)}
            onCreated={(created) => {
              setKind(created.kind);
              setCategoryId(created.id);
            }}
          />
        </Suspense>
      )}
    </Sheet>
  );
}
