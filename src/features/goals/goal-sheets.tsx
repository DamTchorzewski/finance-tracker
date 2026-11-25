import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GoalJar } from "@/components/brand/goal-jar.tsx";
import { SuccessCheck } from "@/components/brand/motion.tsx";
import { Amount } from "@/components/ui/amount.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, Input, Segmented, Select } from "@/components/ui/field.tsx";
import { FormFooter } from "@/components/ui/form-footer.tsx";
import { ColourPicker, IconPicker } from "@/components/ui/look-picker.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import { useAccounts, useContributions, useGoalMutations } from "@/data/queries.ts";
import { DataError, type CategoryColour, type Goal } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { formatDay, today } from "@/lib/dates.ts";
import { amountInput, parseAmount } from "@/lib/money.ts";
import { useBase } from "../shared.tsx";

const COLOURS: CategoryColour[] = [
  "teal",
  "sky",
  "indigo",
  "violet",
  "plum",
  "rose",
  "coral",
  "amber",
  "lime",
  "sage",
];
const ICONS = [
  "piggy-bank",
  "plane",
  "laptop",
  "house",
  "car",
  "gift",
  "graduation-cap",
  "baby",
  "bike",
  "smartphone",
  "music",
  "tent-tree",
];

/** Add or change a goal: name, target, an optional day, an optional savings account, icon and colour. */
export function GoalSheet({
  goal,
  open,
  onOpenChange,
}: {
  goal?: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { base } = useBase();
  const { create, update, remove } = useGoalMutations();
  const currency = goal?.currency ?? base;
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived && a.currency === currency);
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? amountInput(goal.targetMinor, currency, locale) : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [accountId, setAccountId] = useState(goal?.accountId ?? "");
  const [icon, setIcon] = useState(goal?.icon ?? "piggy-bank");
  const [colour, setColour] = useState<CategoryColour>(goal?.colour ?? "teal");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const targetMinor = parseAmount(target, currency);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t.required;
    if (!targetMinor || targetMinor <= 0) next.target = t.goals.target;
    setErrors(next);
    if (Object.keys(next).length || !targetMinor) return;
    const fields = {
      name: name.trim(),
      targetMinor,
      targetDate: targetDate || null,
      accountId: accountId || null,
      icon,
      colour,
    };
    try {
      if (goal) await update.mutateAsync({ id: goal.id, patch: fields });
      else await create.mutateAsync({ ...fields, currency });
      toast.success(t.settings.saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof DataError ? err.message : t.somethingWrong);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? goal.name : t.goals.new}
      footer={
        <FormFooter
          form="goal-form"
          onCancel={() => onOpenChange(false)}
          onDelete={
            goal &&
            (async () => {
              await remove.mutateAsync(goal.id);
              onOpenChange(false);
            })
          }
        />
      }
    >
      <form
        id="goal-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        className="flex flex-col gap-5 pt-1"
      >
        <Field label={t.goals.name} error={errors.name}>
          {(props) => (
            <Input
              {...props}
              autoFocus
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <Field label={`${t.goals.target} (${currency})`} error={errors.target}>
          {(props) => (
            <Input
              {...props}
              inputMode="decimal"
              placeholder="0,00"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="tabular h-14 text-2xl font-extrabold"
            />
          )}
        </Field>
        <Field label={t.goals.date} hint={t.goals.dateHint} optional={t.optional}>
          {(props) => (
            <Input
              {...props}
              type="date"
              min={today()}
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          )}
        </Field>
        <Field label={t.goals.account} hint={t.goals.accountHint} optional={t.optional}>
          {(props) => (
            <Select
              {...props}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="">{t.goals.noAccount}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <ColourPicker colours={COLOURS} value={colour} onChange={setColour} />
        <IconPicker icons={ICONS} value={icon} onChange={setIcon} />
      </form>
    </Sheet>
  );
}

/** Put money in or take it out of a goal, and see what went in before. */
export function ContributeSheet({
  goal,
  open,
  onOpenChange,
  initialDirection = "in",
}: {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDirection?: "in" | "out";
}) {
  const { t, locale } = useI18n();
  const { contribute, uncontribute } = useGoalMutations();
  const history = useContributions(goal.id);
  const [direction, setDirection] = useState<"in" | "out">(initialDirection);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  // the jar shows where the goal will be after this amount (a coin drops in as it grows)
  const typed = parseAmount(amount, goal.currency) ?? 0;
  const jarLevel =
    goal.targetMinor > 0
      ? (goal.savedMinor + (direction === "in" ? typed : -typed)) / goal.targetMinor
      : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const minor = parseAmount(amount, goal.currency);
    if (!minor || minor <= 0) return setError(t.tx.amount);
    try {
      await contribute.mutateAsync({
        goalId: goal.id,
        input: { amountMinor: direction === "in" ? minor : -minor, date, note: note.trim() },
      });
      const reached =
        direction === "in" &&
        goal.savedMinor < goal.targetMinor &&
        goal.savedMinor + minor >= goal.targetMinor;
      if (reached) toast.success(`${t.goals.reached} ${goal.name}`, { icon: "🎉" });
      else toast.success(t.goals.saved, { icon: <SuccessCheck /> });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof DataError ? err.message : t.somethingWrong);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={goal.name}
      description={t.goals.contributeLead}
      footer={
        <FormFooter
          form="contribute-form"
          submitLabel={direction === "in" ? t.goals.putIn : t.goals.takeOut}
          busy={contribute.isPending}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form
        id="contribute-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        className="flex flex-col gap-5 pt-1"
      >
        <GoalJar
          level={jarLevel}
          label={`${goal.name}: ${Math.round(jarLevel * 100)}%`}
          className="mx-auto h-36 w-auto"
        />
        <Segmented
          label={t.goals.direction}
          value={direction}
          onChange={setDirection}
          options={[
            { value: "in", label: t.goals.putIn },
            { value: "out", label: t.goals.takeOut },
          ]}
          className="w-full [&>button]:flex-1"
        />
        <Field label={`${t.tx.amount} (${goal.currency})`} error={error}>
          {(props) => (
            <Input
              {...props}
              autoFocus
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="tabular h-16 text-3xl font-extrabold"
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.tx.date}>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value || today())}
              />
            )}
          </Field>
          <Field label={t.tx.note} optional={t.optional}>
            {(props) => (
              <Input
                {...props}
                maxLength={100}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            )}
          </Field>
        </div>
      </form>

      <section aria-labelledby="goal-history" className="mt-6">
        <h3 id="goal-history" className="mb-2 text-sm font-bold">
          {t.goals.history}
        </h3>
        {(history.data ?? []).length === 0 ? (
          <p className="text-sm text-muted">{t.goals.noHistory}</p>
        ) : (
          <ul className="divide-y divide-border">
            {(history.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="tabular w-16 shrink-0 text-muted">
                  {formatDay(c.date, locale)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {c.note || (c.amountMinor > 0 ? t.goals.putIn : t.goals.takeOut)}
                </span>
                <Amount
                  minor={c.amountMinor}
                  currency={goal.currency}
                  signed
                  tone="auto"
                  className="font-semibold"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${t.delete}: ${formatDay(c.date, locale)}`}
                  onClick={() => uncontribute.mutate({ goalId: goal.id, id: c.id })}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Sheet>
  );
}
