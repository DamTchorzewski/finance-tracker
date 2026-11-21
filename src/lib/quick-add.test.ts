import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quick-add.ts";

const NOW = "2026-11-21";

describe("quick add", () => {
  it("reads an expense with a day word", () => {
    expect(parseQuickAdd("kawa 14 zł wczoraj", NOW)).toEqual({
      kind: "expense",
      amountMinor: 1400,
      date: "2026-11-20",
      note: "Kawa",
      categoryKey: "eating-out",
    });
  });

  it("reads income with a plus or a salary word", () => {
    expect(parseQuickAdd("+5200 pensja", NOW)).toMatchObject({
      kind: "income",
      amountMinor: 520_000,
      categoryKey: "salary",
    });
    expect(parseQuickAdd("zwrot od Ani + 50", NOW)).toMatchObject({
      kind: "income",
      amountMinor: 5000,
      note: "Zwrot od Ani",
    });
  });

  it("reads decimals, a dd.mm date and a store name", () => {
    expect(parseQuickAdd("Biedronka 86,40 18.11", NOW)).toMatchObject({
      amountMinor: 8640,
      date: "2026-11-18",
      categoryKey: "groceries",
    });
    expect(parseQuickAdd("uber 32.5 25.12", NOW)?.date).toBe("2025-12-25");
  });

  it("needs an amount", () => {
    expect(parseQuickAdd("kawa", NOW)).toBeNull();
    expect(parseQuickAdd("", NOW)).toBeNull();
  });
});
