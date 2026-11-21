import { Link } from "@tanstack/react-router";
import { Download, FileText, History, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/auth/session.tsx";
import { Button, buttonStyles } from "@/components/ui/button.tsx";
import { Card, CardHeader } from "@/components/ui/card.tsx";
import { Field, Select } from "@/components/ui/field.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import {
  useAccounts,
  useCategories,
  useImportV1,
  useTransactionMutations,
} from "@/data/queries.ts";
import { DataError } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { useSource } from "@/auth/session.tsx";
import { addDays, addMonths, today } from "@/lib/dates.ts";
import {
  duplicateKey,
  guessColumns,
  parseCsv,
  parseCsvDate,
  toCsv,
  type CsvColumn,
} from "@/lib/csv.ts";
import { amountInput, parseAmount } from "@/lib/money.ts";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function CsvImport({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, fill, locale } = useI18n();
  const source = useSource();
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
  const categories = useCategories().data ?? [];
  const { create } = useTransactionMutations();
  const [rows, setRows] = useState<string[][]>([]);
  const [columns, setColumns] = useState<Record<CsvColumn, number>>({
    date: -1,
    amount: -1,
    note: -1,
    payee: -1,
    category: -1,
  });
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const account = accounts.find((a) => a.id === accountId);

  const parsed = body
    .map((row) => {
      const date = parseCsvDate(row[columns.date] ?? "");
      const signed = parseAmount(row[columns.amount] ?? "", account?.currency ?? "PLN");
      return date && signed
        ? {
            date,
            signed,
            note: row[columns.note] ?? "",
            payee: row[columns.payee] ?? "",
            category: row[columns.category] ?? "",
          }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  async function run() {
    if (!account) return;
    setBusy(true);
    try {
      const dates = parsed.map((p) => p.date).sort();
      const existing = dates.length
        ? await source.transactions({ from: dates[0]!, to: dates.at(-1)!, accountId: account.id })
        : [];
      const seen = new Set(
        existing.map((tx) =>
          duplicateKey(
            tx.date,
            tx.kind === "expense" ? -tx.amountMinor : tx.amountMinor,
            tx.note || tx.payee || "",
          ),
        ),
      );
      let done = 0;
      for (const row of parsed) {
        const key = duplicateKey(row.date, row.signed, row.note || row.payee);
        if (seen.has(key)) continue;
        seen.add(key);
        const kind = row.signed < 0 ? "expense" : "income";
        const category = categories.find(
          (c) => c.kind === kind && c.name.toLowerCase() === row.category.toLowerCase(),
        );
        await create.mutateAsync({
          accountId: account.id,
          kind,
          amountMinor: Math.abs(row.signed),
          date: row.date,
          categoryId: category?.id ?? null,
          note: row.note.slice(0, 200),
          payee: row.payee.slice(0, 60) || null,
          tags: ["csv"],
          toAccountId: null,
          toAmountMinor: null,
        });
        done++;
      }
      toast.success(fill(t.csv.done, { n: done }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof DataError ? err.message : t.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.settings.importCsv}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button
            className="flex-[2]"
            disabled={busy || parsed.length === 0 || !account}
            onClick={() => void run()}
          >
            {t.add} ({parsed.length})
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center text-sm font-semibold hover:bg-surface-2">
          <Upload aria-hidden="true" className="size-6 text-accent" />
          {t.csv.pick}
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const next = parseCsv(await file.text());
                if (next.length < 2) throw new Error("empty");
                setRows(next);
                setColumns(guessColumns(next[0] ?? []));
              } catch {
                toast.error(t.csv.invalid);
              }
            }}
          />
        </label>

        {rows.length > 1 && (
          <>
            <p className="text-sm text-muted">{fill(t.csv.preview, { n: body.length })}</p>
            <Field label={t.csv.importTo}>
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
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="mb-2 text-sm font-semibold">{t.csv.columns}</legend>
              {(Object.keys(columns) as CsvColumn[]).map((column) => (
                <Field key={column} label={t.csv.column[column]}>
                  {(props) => (
                    <Select
                      {...props}
                      value={columns[column]}
                      onChange={(event) =>
                        setColumns((old) => ({ ...old, [column]: Number(event.target.value) }))
                      }
                    >
                      <option value={-1}>—</option>
                      {header.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `#${i + 1}`}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              ))}
            </fieldset>
            <ul className="divide-y divide-border rounded-2xl bg-surface-2 text-sm">
              {parsed.slice(0, 5).map((row, i) => (
                <li key={i} className="flex justify-between gap-3 px-3 py-2">
                  <span className="truncate">
                    {row.date} · {row.note || row.payee}
                  </span>
                  <span className="tabular shrink-0 font-semibold">
                    {amountInput(row.signed, account?.currency ?? "PLN", locale)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Sheet>
  );
}

export function DataSection() {
  const { t, fill } = useI18n();
  const { session } = useSession();
  const source = useSource();
  const categories = useCategories().data ?? [];
  const accounts = useAccounts().data ?? [];
  const importV1 = useImportV1();
  const [csv, setCsv] = useState({ open: false, key: 0 });

  async function exportCsv() {
    const items = await source.transactions({
      from: addDays(addMonths(today(), -12), 1),
      to: today(),
    });
    const name = (id: string | null, list: { id: string; name: string }[]) =>
      list.find((x) => x.id === id)?.name ?? "";
    download(
      `transakcje-${today()}.csv`,
      toCsv([
        [
          "Data",
          "Rodzaj",
          "Kwota",
          "Waluta",
          "Kwota PLN",
          "Konto",
          "Kategoria",
          "Opis",
          "Odbiorca",
          "Tagi",
        ],
        ...items.map((tx) => [
          tx.date,
          tx.kind,
          (tx.kind === "expense" ? -tx.amountMinor : tx.amountMinor) / 100,
          tx.currency,
          tx.plnMinor / 100,
          name(tx.accountId, accounts),
          name(tx.categoryId, categories),
          tx.note,
          tx.payee,
          tx.tags.join(", "),
        ]),
      ]),
    );
  }

  return (
    <Card aria-labelledby="s-data">
      <CardHeader id="s-data" title={t.settings.data} />
      <div className="flex flex-col gap-2">
        <Button variant="outline" className="justify-start" onClick={() => void exportCsv()}>
          <Download aria-hidden="true" />
          {t.settings.exportCsv}
        </Button>
        <Link
          to="/report"
          className={buttonStyles({ variant: "outline", className: "justify-start" })}
        >
          <FileText aria-hidden="true" />
          {t.report.open}
        </Link>
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => setCsv((old) => ({ open: true, key: old.key + 1 }))}
        >
          <Upload aria-hidden="true" />
          {t.settings.importCsv}
        </Button>
        {session.status === "user" && (
          <div className="mt-2 rounded-2xl bg-surface-2 p-4">
            <Button
              variant="secondary"
              disabled={importV1.isPending}
              onClick={async () => {
                try {
                  const result = await importV1.mutateAsync();
                  toast.success(
                    fill(t.settings.importV1Done, { n: result.imported, skipped: result.skipped }),
                  );
                } catch (err) {
                  toast.error(err instanceof DataError ? err.message : t.somethingWrong);
                }
              }}
            >
              <History aria-hidden="true" />
              {t.settings.importV1}
            </Button>
            <p className="mt-2 text-xs text-muted">{t.settings.importV1Hint}</p>
          </div>
        )}
      </div>
      {csv.key > 0 && (
        <CsvImport
          key={csv.key}
          open={csv.open}
          onOpenChange={(open) => setCsv((old) => ({ ...old, open }))}
        />
      )}
    </Card>
  );
}
