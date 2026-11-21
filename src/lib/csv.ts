// CSV in and out. Export writes UTF-8 with a BOM and `;` (Excel in Poland opens it right away); import reads both
// `;` and `,`, quoted fields, and guesses which column is which from the headers of the usual bank exports.

export function toCsv(rows: (string | number | null)[][], delimiter = ";"): string {
  const cell = (value: string | number | null) => {
    const text = value === null ? "" : String(value);
    return /[";\n\r,]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `\uFEFF${rows.map((row) => row.map(cell).join(delimiter)).join("\r\n")}\r\n`;
}

/** Splits CSV text into rows of cells; the delimiter is the one (`;`, `,` or tab) the first line uses most. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", ",", "\t"].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best,
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (quoted) {
      if (char === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row.map((c) => c.trim()));
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row.map((c) => c.trim()));
  return rows;
}

export type CsvColumn = "date" | "amount" | "note" | "payee" | "category";

const HINTS: Record<CsvColumn, RegExp> = {
  date: /data|date|dzień|day|operacji|księgowania/i,
  amount: /kwota|amount|suma|wartość|value|obciążenia|uznania/i,
  note: /opis|tytuł|title|description|note|notatka|szczegóły/i,
  payee: /odbiorca|nadawca|kontrahent|payee|merchant|counterparty|nazwa/i,
  category: /kategoria|category/i,
};

/** Which column holds what, guessed from the header row; -1 when nothing matches. */
export function guessColumns(header: string[]): Record<CsvColumn, number> {
  const used = new Set<number>();
  const pick = (column: CsvColumn) => {
    const index = header.findIndex((h, i) => !used.has(i) && HINTS[column].test(h));
    if (index >= 0) used.add(index);
    return index;
  };
  return {
    date: pick("date"),
    amount: pick("amount"),
    note: pick("note"),
    payee: pick("payee"),
    category: pick("category"),
  };
}

/** "21.11.2026", "2026-11-21", "21/11/2026" → "2026-11-21", or null. */
export function parseCsvDate(text: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  return null;
}

/** A key that is equal for the same movement exported twice (same day, amount and text). */
export const duplicateKey = (date: string, amountMinor: number, text: string) =>
  `${date}|${amountMinor}|${text.toLowerCase().replace(/\s+/g, " ").trim()}`;
