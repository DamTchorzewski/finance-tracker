import { describe, expect, it } from "vitest";
import { duplicateKey, guessColumns, parseCsv, parseCsvDate, toCsv } from "./csv.ts";

describe("csv", () => {
  it("writes cells that Excel opens, quoting what needs it", () => {
    const text = toCsv([
      ["Data", "Opis", "Kwota"],
      ["2026-11-20", 'Kawa "Mała"; na wynos', "-14,50"],
    ]);
    expect(text.startsWith("﻿")).toBe(true);
    expect(text).toContain('"Kawa ""Mała""; na wynos"');
  });

  it("reads semicolon and comma files with quotes and new lines in a field", () => {
    expect(parseCsv('Data;Opis;Kwota\r\n20.11.2026;"Zakupy; Lidl";-86,40\r\n')).toEqual([
      ["Data", "Opis", "Kwota"],
      ["20.11.2026", "Zakupy; Lidl", "-86,40"],
    ]);
    expect(parseCsv('date,description,amount\n2026-11-20,"Line\nbreak",12.5')).toEqual([
      ["date", "description", "amount"],
      ["2026-11-20", "Line\nbreak", "12.5"],
    ]);
  });

  it("guesses the columns of a Polish bank export", () => {
    expect(
      guessColumns(["Data operacji", "Opis operacji", "Kwota", "Nadawca / Odbiorca", "Kategoria"]),
    ).toEqual({
      date: 0,
      amount: 2,
      note: 1,
      payee: 3,
      category: 4,
    });
  });

  it("reads the usual date formats", () => {
    expect(parseCsvDate("20.11.2026")).toBe("2026-11-20");
    expect(parseCsvDate("2026-11-20 10:15")).toBe("2026-11-20");
    expect(parseCsvDate("1/2/2026")).toBe("2026-02-01");
    expect(parseCsvDate("wczoraj")).toBeNull();
  });

  it("treats the same movement as a duplicate regardless of spacing and case", () => {
    expect(duplicateKey("2026-11-20", -8640, "Lidl  Warszawa")).toBe(
      duplicateKey("2026-11-20", -8640, "lidl warszawa"),
    );
  });
});
