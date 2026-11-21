import { addDays, today } from "./dates.ts";
import { parseAmount } from "./money.ts";

// Quick add in plain words, used by the command palette: "kawa 14 zł wczoraj", "+5200 pensja", "uber 32,50".
// A local parser (no AI service): an amount, an optional day word or dd.mm date, a + for income, the rest is the note,
// and a category key guessed from common words.

export interface QuickAdd {
  kind: "expense" | "income";
  amountMinor: number;
  date: string;
  note: string;
  categoryKey?: string;
}

const DAY_WORDS: Record<string, number> = {
  dziś: 0,
  dzis: 0,
  dzisiaj: 0,
  today: 0,
  wczoraj: -1,
  yesterday: -1,
  przedwczoraj: -2,
};

const CATEGORY_WORDS: [RegExp, string][] = [
  [/kaw|coffee|lunch|obiad|kolacj|dinner|pizza|burger|restaurac|kebab|sushi/i, "eating-out"],
  [/biedronk|lidl|żabk|zabk|auchan|carrefour|kaufland|zakupy|grocer|market/i, "groceries"],
  [/paliw|orlen|shell|bp\b|fuel|benzyn|myjni/i, "car"],
  [/uber|bolt|taxi|taksówk|bilet|ticket|pkp|mpk|ztm|metro|tramwaj/i, "transport"],
  [/netflix|spotify|youtube|disney|hbo|max\b|icloud|subskryp|subscription/i, "subscriptions"],
  [/aptek|pharmac|lekarz|doctor|dentyst|fryzjer|haircut/i, "health"],
  [/kino|cinema|koncert|concert|teatr|gra\b|game/i, "entertainment"],
  [/czynsz|rent|prąd|prad|gaz|internet|rachun/i, "housing"],
  [/prezent|gift/i, "gifts"],
  [/pensj|wypłat|wyplat|salary|wynagrodz/i, "salary"],
];

export function parseQuickAdd(text: string, now = today()): QuickAdd | null {
  let rest = ` ${text.trim()} `;
  let income = false;

  const plus = /\s\+\s?(?=\d)/.exec(rest);
  if (plus) {
    income = true;
    rest = rest.replace(plus[0], " ");
  }

  const amountMatch = /\s(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:zł|zl|pln)?(?=\s)/i.exec(rest);
  if (!amountMatch?.[1]) return null;
  const amountMinor = parseAmount(amountMatch[1], "PLN");
  if (!amountMinor || amountMinor <= 0) return null;
  rest = rest.replace(amountMatch[0], " ");

  let date = now;
  for (const [word, shift] of Object.entries(DAY_WORDS)) {
    const pattern = new RegExp(`\\s${word}(?=\\s)`, "i");
    if (pattern.test(rest)) {
      date = addDays(now, shift);
      rest = rest.replace(pattern, " ");
    }
  }
  const dm = /\s(\d{1,2})\.(\d{1,2})\.?(?=\s)/.exec(rest);
  if (dm) {
    const candidate = `${now.slice(0, 4)}-${dm[2]!.padStart(2, "0")}-${dm[1]!.padStart(2, "0")}`;
    date = candidate > now ? `${Number(now.slice(0, 4)) - 1}${candidate.slice(4)}` : candidate;
    rest = rest.replace(dm[0], " ");
  }

  const note = rest.replace(/\s+/g, " ").trim();
  const categoryKey = CATEGORY_WORDS.find(([pattern]) => pattern.test(note))?.[1];
  const kind = income || categoryKey === "salary" ? "income" : "expense";
  return {
    kind,
    amountMinor,
    date,
    note: note.charAt(0).toUpperCase() + note.slice(1),
    categoryKey,
  };
}
