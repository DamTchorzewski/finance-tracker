import {
  Archive,
  ArchiveRestore,
  Banknote,
  CreditCard,
  Globe,
  Landmark,
  PiggyBank,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import onboardingAccounts from "@/assets/illustrations/onboarding-accounts.svg?raw";
import { toast } from "sonner";
import { Amount } from "@/components/ui/amount.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, EmptyState, Skeleton } from "@/components/ui/card.tsx";
import { Field, Input, Select } from "@/components/ui/field.tsx";
import { FormFooter } from "@/components/ui/form-footer.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import { useAccountMutations, useAccounts } from "@/data/queries.ts";
import { DataError, type Account } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { amountInput, parseAmount } from "@/lib/money.ts";
import { netWorth } from "@/lib/stats.ts";
import { PageHeader, useBase } from "../shared.tsx";

const KIND_ICONS: Record<Account["kind"], LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  savings: PiggyBank,
  card: CreditCard,
  foreign: Globe,
};

export const COMMON_CURRENCIES = [
  "PLN",
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "CZK",
  "SEK",
  "NOK",
  "DKK",
  "JPY",
  "CAD",
  "AUD",
  "HUF",
  "UAH",
];

function AccountSheet({
  account,
  open,
  onOpenChange,
}: {
  account?: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { create, update, remove } = useAccountMutations();
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<Account["kind"]>(account?.kind ?? "bank");
  const [currency, setCurrency] = useState(account?.currency ?? "PLN");
  const [opening, setOpening] = useState(
    account ? amountInput(account.openingBalanceMinor, account.currency, locale) : "",
  );
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError(t.required);
    const openingBalanceMinor = opening.trim() ? (parseAmount(opening, currency) ?? 0) : 0;
    try {
      if (account)
        await update.mutateAsync({
          id: account.id,
          patch: { name: name.trim(), kind, openingBalanceMinor },
        });
      else await create.mutateAsync({ name: name.trim(), kind, currency, openingBalanceMinor });
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
      title={account ? account.name : t.accounts.new}
      footer={
        <FormFooter
          form="account-form"
          onCancel={() => onOpenChange(false)}
          onDelete={
            account &&
            (async () => {
              try {
                await remove.mutateAsync(account.id);
                onOpenChange(false);
              } catch (err) {
                toast.error(
                  err instanceof DataError && err.status === 409
                    ? t.accounts.inUse
                    : t.somethingWrong,
                );
              }
            })
          }
        />
      }
    >
      <form
        id="account-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        className="flex flex-col gap-4 pt-1"
      >
        <Field label={t.accounts.name} error={error}>
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
        <Field label={t.accounts.kind}>
          {(props) => (
            <Select
              {...props}
              value={kind}
              onChange={(event) => setKind(event.target.value as Account["kind"])}
            >
              {(Object.keys(KIND_ICONS) as Account["kind"][]).map((k) => (
                <option key={k} value={k}>
                  {t.accounts.kinds[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t.accounts.currency}>
          {(props) => (
            <Select
              {...props}
              value={currency}
              disabled={Boolean(account)}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {COMMON_CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={`${t.accounts.opening} (${currency})`} optional={t.optional}>
          {(props) => (
            <Input
              {...props}
              inputMode="decimal"
              placeholder="0,00"
              value={opening}
              onChange={(event) => setOpening(event.target.value)}
              className="tabular"
            />
          )}
        </Field>
      </form>
    </Sheet>
  );
}

export default function AccountsPage() {
  const { t, fill } = useI18n();
  const { data, isPending } = useAccounts();
  const { update } = useAccountMutations();
  const { base, mids } = useBase();
  const [sheet, setSheet] = useState<{ open: boolean; account?: Account; key: number }>({
    open: false,
    key: 0,
  });
  const open = (account?: Account) =>
    setSheet((old) => ({ open: true, account, key: old.key + 1 }));
  const accounts = data ?? [];
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  const card = (account: Account) => {
    const Icon = KIND_ICONS[account.kind];
    return (
      <li key={account.id}>
        <Card className="flex h-full flex-col gap-4 transition-shadow hover:shadow-float">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-bold">{account.name}</h2>
              <p className="text-xs text-muted">
                {t.accounts.kinds[account.kind]} · {account.currency}
              </p>
            </div>
          </div>
          <Amount
            minor={account.balanceMinor}
            currency={account.currency}
            className="text-2xl font-extrabold tracking-tight"
          />
          <div className="mt-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => open(account)}>
              {t.edit}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                update.mutate({ id: account.id, patch: { archived: !account.archived } })
              }
            >
              {account.archived ? (
                <ArchiveRestore aria-hidden="true" />
              ) : (
                <Archive aria-hidden="true" />
              )}
              {account.archived ? t.accounts.unarchive : t.accounts.archive}
            </Button>
          </div>
        </Card>
      </li>
    );
  };

  return (
    <>
      <PageHeader title={t.accounts.title}>
        <Button onClick={() => open()}>
          <Plus aria-hidden="true" />
          {t.accounts.new}
        </Button>
      </PageHeader>
      {accounts.length > 0 && (
        <p className="mb-4 text-sm font-semibold text-muted">
          {fill(t.accounts.total, { currency: base })}:{" "}
          <Amount
            minor={netWorth(accounts, base, mids)}
            currency={base}
            className="text-lg font-extrabold text-foreground"
          />
        </p>
      )}
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <EmptyState
            illustration={onboardingAccounts}
            title={t.accounts.empty}
            action={<Button onClick={() => open()}>{t.accounts.new}</Button>}
          />
        </Card>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map(card)}
          </ul>
          {archived.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 text-sm font-bold tracking-wide text-muted uppercase">
                {t.accounts.archived}
              </h2>
              <ul className="grid grid-cols-1 gap-4 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map(card)}
              </ul>
            </>
          )}
        </>
      )}
      {sheet.key > 0 && (
        <AccountSheet
          key={sheet.key}
          account={sheet.account}
          open={sheet.open}
          onOpenChange={(next) => setSheet((old) => ({ ...old, open: next }))}
        />
      )}
    </>
  );
}
