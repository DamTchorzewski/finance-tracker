import { addDays, addMonths, today } from "@/lib/dates.ts";
import { convertMinor } from "@/lib/money.ts";
import { DEMO_RATES, DEFAULT_CATEGORIES } from "./seed.ts";
import type { DataSource } from "./source.ts";
import {
  DataError,
  type Account,
  type Budget,
  type Category,
  type Contribution,
  type Goal,
  type Me,
  type Profile,
  type Transaction,
  type TransactionCreate,
} from "./types.ts";

// The demo: one made-up user whose data lives in this browser's localStorage. It follows the same rules as the API
// (balances, the frozen PLN value, checks), so every screen works the same without an account or a network.

const STORAGE_KEY = "ft-demo-v2";

interface State {
  profile: Profile;
  accounts: Omit<Account, "balanceMinor">[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals?: Omit<Goal, "savedMinor">[];
  contributions?: Contribution[];
}

const DEFAULT_PROFILE: Profile = {
  displayName: "Ola",
  baseCurrency: "PLN",
  locale: "pl",
  monthStartDay: 10,
  theme: "system",
  accentHue: 328,
  privacyMode: false,
  widgets: ["balance", "cashflow", "spending", "goals", "budgets", "recent", "rates"],
};

let counter = 0;
const newId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;
const stamp = () => new Date().toISOString();

/** A small seeded random generator, so the sample data is the same on every reset. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function frozen(amountMinor: number, currency: string, date: string) {
  if (currency === "PLN")
    return { plnMinor: amountMinor, rate: { source: "pln" as const, date, mid: 1 } };
  const mid = DEMO_RATES[currency] ?? 1;
  return {
    plnMinor: convertMinor(amountMinor, { code: currency, mid }, { code: "PLN", mid: 1 }),
    rate: { source: "nbp-a" as const, date, mid },
  };
}

export function sampleState(locale: "pl" | "en" = "pl", now = today()): State {
  const at = stamp();
  const rnd = random(20261121);
  const categories: Category[] = DEFAULT_CATEGORIES.map((seed, order) => ({
    id: `c-${seed.key}`,
    key: seed.key,
    name: seed[locale],
    kind: seed.kind,
    icon: seed.icon,
    colour: seed.colour,
    archived: false,
    order,
    createdAt: at,
    updatedAt: at,
  }));
  const cat = (key: string) => `c-${key}`;
  const pl = locale === "pl";

  const accounts: State["accounts"] = [
    {
      id: "a-bank",
      name: pl ? "Konto osobiste" : "Current account",
      kind: "bank",
      currency: "PLN",
      openingBalanceMinor: 420_000,
      flowMinor: 0,
      archived: false,
      order: 0,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: "a-savings",
      name: pl ? "Oszczędności" : "Savings",
      kind: "savings",
      currency: "PLN",
      openingBalanceMinor: 1_250_000,
      flowMinor: 0,
      archived: false,
      order: 1,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: "a-cash",
      name: pl ? "Gotówka" : "Cash",
      kind: "cash",
      currency: "PLN",
      openingBalanceMinor: 35_000,
      flowMinor: 0,
      archived: false,
      order: 2,
      createdAt: at,
      updatedAt: at,
    },
    {
      id: "a-eur",
      name: pl ? "Konto w euro" : "Euro account",
      kind: "foreign",
      currency: "EUR",
      openingBalanceMinor: 60_000,
      flowMinor: 0,
      archived: false,
      order: 3,
      createdAt: at,
      updatedAt: at,
    },
  ];

  const transactions: Transaction[] = [];
  const push = (
    date: string,
    kind: Transaction["kind"],
    accountId: string,
    amountMinor: number,
    categoryId: string | null,
    note: string,
    extra: Partial<Transaction> = {},
  ) => {
    if (date > now) return;
    const currency = accounts.find((a) => a.id === accountId)?.currency ?? "PLN";
    transactions.push({
      id: newId(),
      accountId,
      kind,
      amountMinor,
      currency,
      date,
      categoryId,
      note,
      payee: null,
      tags: [],
      toAccountId: null,
      toAmountMinor: null,
      ...frozen(amountMinor, currency, date),
      origin: "app",
      createdAt: at,
      updatedAt: at,
      ...extra,
    });
  };

  const start = addMonths(now, -12);
  for (let month = 0; month <= 12; month++) {
    const base = addMonths(start, month).slice(0, 8);
    const day = (d: number) => `${base}${String(d).padStart(2, "0")}`;
    push(day(10), "income", "a-bank", 780_000, cat("salary"), pl ? "Wynagrodzenie" : "Salary", {
      payee: "Studio Atlas",
    });
    push(day(11), "expense", "a-bank", 230_000, cat("housing"), pl ? "Czynsz" : "Rent");
    push(
      day(14),
      "expense",
      "a-bank",
      31_000 + Math.round(rnd() * 9000),
      cat("housing"),
      pl ? "Prąd i internet" : "Power and internet",
    );
    push(day(12), "transfer", "a-bank", 80_000, null, pl ? "Na oszczędności" : "To savings", {
      toAccountId: "a-savings",
      toAmountMinor: 80_000,
    });
    push(day(5), "expense", "a-bank", 4900, cat("subscriptions"), "Netflix", { payee: "Netflix" });
    push(day(7), "expense", "a-bank", 2399, cat("subscriptions"), "Spotify", { payee: "Spotify" });
    push(day(18), "expense", "a-bank", 1199, cat("subscriptions"), "iCloud+", { payee: "Apple" });
    push(
      day(2),
      "expense",
      "a-bank",
      11_000,
      cat("transport"),
      pl ? "Bilet miesięczny" : "Monthly pass",
    );
    push(
      day(9),
      "transfer",
      "a-bank",
      40_000,
      null,
      pl ? "Wypłata z bankomatu" : "Cash withdrawal",
      {
        toAccountId: "a-cash",
        toAmountMinor: 40_000,
      },
    );
    if (month % 3 === 0)
      push(
        day(22),
        "income",
        "a-bank",
        120_000 + Math.round(rnd() * 80_000),
        cat("freelance"),
        pl ? "Projekt strony" : "Website project",
      );
    for (let week = 0; week < 4; week++) {
      const d = 3 + week * 7;
      push(
        day(d),
        "expense",
        "a-bank",
        9000 + Math.round(rnd() * 16_000),
        cat("groceries"),
        rnd() > 0.5 ? "Biedronka" : "Lidl",
        { payee: rnd() > 0.5 ? "Biedronka" : "Lidl" },
      );
      if (rnd() > 0.35)
        push(
          day(d + 2),
          "expense",
          rnd() > 0.7 ? "a-cash" : "a-bank",
          2800 + Math.round(rnd() * 9000),
          cat("eating-out"),
          pl ? "Obiad na mieście" : "Lunch out",
        );
    }
    if (rnd() > 0.4)
      push(
        day(20),
        "expense",
        "a-bank",
        6000 + Math.round(rnd() * 14_000),
        cat("entertainment"),
        pl ? "Kino i koncert" : "Cinema and a concert",
      );
    if (rnd() > 0.5)
      push(
        day(16),
        "expense",
        "a-bank",
        8000 + Math.round(rnd() * 20_000),
        cat("health"),
        pl ? "Apteka i fryzjer" : "Pharmacy and a haircut",
      );
    if (rnd() > 0.6)
      push(
        day(25),
        "expense",
        "a-bank",
        5000 + Math.round(rnd() * 25_000),
        cat("household"),
        pl ? "Do domu" : "For the flat",
      );
    if (month === 8) {
      push(
        day(3),
        "expense",
        "a-eur",
        42_000,
        cat("leisure"),
        pl ? "Apartament w Lizbonie" : "Flat in Lisbon",
        { tags: ["lizbona"] },
      );
      push(day(4), "expense", "a-eur", 6800, cat("eating-out"), pl ? "Kolacja" : "Dinner", {
        tags: ["lizbona"],
      });
    }
  }

  for (const tx of transactions) {
    const account = accounts.find((a) => a.id === tx.accountId);
    if (account) account.flowMinor += tx.kind === "income" ? tx.amountMinor : -tx.amountMinor;
    const to = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : undefined;
    if (to) to.flowMinor += tx.toAmountMinor ?? tx.amountMinor;
  }

  const budget = (key: string, limitMinor: number): Budget => ({
    id: `b-${key}`,
    categoryId: cat(key),
    limitMinor,
    currency: "PLN",
    alertAt: [0.8, 1],
    rollover: false,
    createdAt: at,
    updatedAt: at,
  });

  const goal = (
    id: string,
    name: string,
    targetMinor: number,
    targetDate: string | null,
    icon: string,
    colour: Goal["colour"],
    accountId: string | null = null,
  ): Omit<Goal, "savedMinor"> => ({
    id,
    name,
    targetMinor,
    currency: "PLN",
    targetDate,
    accountId,
    icon,
    colour,
    archived: false,
    order: 0,
    createdAt: at,
    updatedAt: at,
  });
  const goals = [
    goal(
      "g-trip",
      pl ? "Wakacje w Lizbonie" : "Holiday in Lisbon",
      800_000,
      addMonths(now, 7),
      "plane",
      "sky",
    ),
    goal(
      "g-cushion",
      pl ? "Poduszka finansowa" : "Rainy-day fund",
      3_000_000,
      null,
      "piggy-bank",
      "teal",
      "a-savings",
    ),
    goal(
      "g-laptop",
      pl ? "Nowy laptop" : "New laptop",
      650_000,
      addMonths(now, 4),
      "laptop",
      "violet",
    ),
  ].map((g, order) => ({ ...g, order }));
  const contributions: Contribution[] = [];
  for (let month = 6; month >= 1; month--) {
    contributions.push({
      id: newId(),
      goalId: "g-trip",
      amountMinor: 60_000,
      date: addMonths(now, -month).slice(0, 8) + "11",
      note: "",
      createdAt: at,
    });
  }
  contributions.push(
    {
      id: newId(),
      goalId: "g-laptop",
      amountMinor: 150_000,
      date: addMonths(now, -2),
      note: pl ? "Premia" : "Bonus",
      createdAt: at,
    },
    {
      id: newId(),
      goalId: "g-laptop",
      amountMinor: 50_000,
      date: addMonths(now, -1),
      note: "",
      createdAt: at,
    },
  );

  return {
    goals,
    contributions,
    profile: { ...DEFAULT_PROFILE, locale, displayName: pl ? "Ola" : "Alex" },
    accounts,
    categories,
    transactions,
    budgets: [
      budget("groceries", 70_000),
      budget("eating-out", 35_000),
      budget("entertainment", 20_000),
      budget("transport", 15_000),
    ],
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as State;
      // a demo saved before the goals existed gets none, and keeps working
      state.goals ??= [];
      state.contributions ??= [];
      return state;
    }
  } catch {
    // a broken value is replaced by the sample data
  }
  return save(sampleState(navigator.language.startsWith("en") ? "en" : "pl"));
}

function save(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: the demo keeps working for this visit
  }
  return state;
}

export function resetDemo(locale: "pl" | "en") {
  save(sampleState(locale));
}

export function clearDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}

const notFound = (what: string) => new DataError(404, "not_found", `No ${what}`);
const invalid = (message: string) => new DataError(400, "validation", message);
const withBalance = (a: State["accounts"][number]): Account => ({
  ...a,
  balanceMinor: a.openingBalanceMinor + a.flowMinor,
});
const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

function applyFlows(state: State, tx: Transaction, sign: 1 | -1) {
  const from = state.accounts.find((a) => a.id === tx.accountId);
  if (from) from.flowMinor += sign * (tx.kind === "income" ? tx.amountMinor : -tx.amountMinor);
  if (tx.kind === "transfer" && tx.toAccountId) {
    const to = state.accounts.find((a) => a.id === tx.toAccountId);
    if (to) to.flowMinor += sign * (tx.toAmountMinor ?? tx.amountMinor);
  }
}

function prepare(state: State, input: TransactionCreate, keep?: Transaction): Transaction {
  const account = state.accounts.find((a) => a.id === input.accountId);
  if (!account) throw notFound("account");
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0)
    throw invalid("Amount must be positive");
  let toAmountMinor: number | null = null;
  if (input.kind === "transfer") {
    const to = state.accounts.find((a) => a.id === input.toAccountId);
    if (!to) throw invalid("A transfer needs `toAccountId`");
    if (to.id === account.id) throw invalid("A transfer needs two different accounts");
    toAmountMinor =
      input.toAmountMinor ??
      convertMinor(
        input.amountMinor,
        {
          code: account.currency,
          mid: account.currency === "PLN" ? 1 : (DEMO_RATES[account.currency] ?? 1),
        },
        { code: to.currency, mid: to.currency === "PLN" ? 1 : (DEMO_RATES[to.currency] ?? 1) },
      );
  } else if (input.categoryId) {
    const category = state.categories.find((c) => c.id === input.categoryId);
    if (!category) throw notFound("category");
    if (category.kind !== input.kind) throw invalid(`The category is for ${category.kind}`);
  }
  const at = stamp();
  return {
    id: keep?.id ?? newId(),
    accountId: input.accountId,
    kind: input.kind,
    amountMinor: input.amountMinor,
    currency: account.currency,
    date: input.date,
    categoryId: input.kind === "transfer" ? null : (input.categoryId ?? null),
    note: input.note ?? "",
    payee: input.payee ?? null,
    tags: input.tags ?? [],
    toAccountId: input.kind === "transfer" ? (input.toAccountId ?? null) : null,
    toAmountMinor,
    ...frozen(input.amountMinor, account.currency, input.date),
    origin: keep?.origin ?? "app",
    createdAt: keep?.createdAt ?? at,
    updatedAt: at,
  };
}

/** Runs a change against the stored state and saves it; reads get a copy. */
function change<T>(fn: (state: State) => T): Promise<T> {
  try {
    const state = load();
    const result = fn(state);
    save(state);
    return Promise.resolve(structuredClone(result));
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  }
}

const read = <T>(fn: (state: State) => T) => change(fn);

export const demoSource: DataSource = {
  kind: "demo",

  me: () =>
    read<Me>((s) => ({
      user: {
        uid: "demo",
        email: "demo@example.com",
        name: s.profile.displayName,
        emailVerified: true,
      },
      profile: s.profile,
    })),
  updateProfile: (patch) => change((s) => (s.profile = { ...s.profile, ...patch })),

  accounts: () => read((s) => [...s.accounts].sort(byOrder).map(withBalance)),
  createAccount: (input) =>
    change((s) => {
      const at = stamp();
      const account = {
        ...input,
        openingBalanceMinor: input.openingBalanceMinor ?? 0,
        order: input.order ?? s.accounts.length,
        id: newId(),
        flowMinor: 0,
        archived: false,
        createdAt: at,
        updatedAt: at,
      };
      s.accounts.push(account);
      return withBalance(account);
    }),
  updateAccount: (id, patch) =>
    change((s) => {
      const account = s.accounts.find((a) => a.id === id);
      if (!account) throw notFound("account");
      Object.assign(account, patch, { updatedAt: stamp() });
      return withBalance(account);
    }),
  deleteAccount: (id) =>
    change((s) => {
      if (s.transactions.some((t) => t.accountId === id || t.toAccountId === id)) {
        throw new DataError(409, "conflict", "The account has transactions");
      }
      s.accounts = s.accounts.filter((a) => a.id !== id);
    }),

  categories: () => read((s) => [...s.categories].sort(byOrder)),
  createCategory: (input) =>
    change((s) => {
      const at = stamp();
      const category: Category = {
        ...input,
        key: null,
        order: input.order ?? s.categories.length,
        archived: false,
        id: newId(),
        createdAt: at,
        updatedAt: at,
      };
      s.categories.push(category);
      return category;
    }),
  updateCategory: (id, patch) =>
    change((s) => {
      const category = s.categories.find((c) => c.id === id);
      if (!category) throw notFound("category");
      Object.assign(category, patch, { updatedAt: stamp() });
      return category;
    }),
  deleteCategory: (id) =>
    change((s) => {
      if (s.transactions.some((t) => t.categoryId === id))
        throw new DataError(409, "conflict", "In use");
      if (s.budgets.some((b) => b.categoryId === id))
        throw new DataError(409, "conflict", "Has a budget");
      s.categories = s.categories.filter((c) => c.id !== id);
    }),

  transactions: (q) =>
    read((s) => {
      const text = q.q?.toLocaleLowerCase();
      return s.transactions
        .filter(
          (t) =>
            t.date >= q.from &&
            t.date <= q.to &&
            (!q.accountId || t.accountId === q.accountId || t.toAccountId === q.accountId) &&
            (!q.categoryId || t.categoryId === q.categoryId) &&
            (!q.kind || t.kind === q.kind) &&
            (!text ||
              [t.note, t.payee ?? "", ...t.tags].some((f) => f.toLocaleLowerCase().includes(text))),
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }),
  createTransaction: (input) =>
    change((s) => {
      const tx = prepare(s, input);
      s.transactions.push(tx);
      applyFlows(s, tx, 1);
      return tx;
    }),
  updateTransaction: (id, patch) =>
    change((s) => {
      const current = s.transactions.find((t) => t.id === id);
      if (!current) throw notFound("transaction");
      const merged = { ...current, ...patch };
      const transfer = merged.kind === "transfer";
      const next = prepare(
        s,
        {
          ...merged,
          categoryId: transfer ? null : merged.categoryId,
          toAccountId: transfer ? merged.toAccountId : null,
          toAmountMinor:
            transfer && (patch.toAmountMinor !== undefined || patch.amountMinor === undefined)
              ? merged.toAmountMinor
              : null,
        },
        current,
      );
      applyFlows(s, current, -1);
      applyFlows(s, next, 1);
      s.transactions = s.transactions.map((t) => (t.id === id ? next : t));
      return next;
    }),
  deleteTransaction: (id) =>
    change((s) => {
      const current = s.transactions.find((t) => t.id === id);
      if (!current) throw notFound("transaction");
      applyFlows(s, current, -1);
      s.transactions = s.transactions.filter((t) => t.id !== id);
    }),

  budgets: () => read((s) => s.budgets),
  createBudget: (input) =>
    change((s) => {
      if (s.budgets.some((b) => b.categoryId === input.categoryId))
        throw new DataError(409, "conflict", "Exists");
      const at = stamp();
      const budget: Budget = {
        ...input,
        alertAt: input.alertAt ?? [0.8, 1],
        rollover: input.rollover ?? false,
        currency: input.currency ?? s.profile.baseCurrency,
        id: newId(),
        createdAt: at,
        updatedAt: at,
      };
      s.budgets.push(budget);
      return budget;
    }),
  updateBudget: (id, patch) =>
    change((s) => {
      const budget = s.budgets.find((b) => b.id === id);
      if (!budget) throw notFound("budget");
      Object.assign(budget, patch, { updatedAt: stamp() });
      return budget;
    }),
  deleteBudget: (id) =>
    change((s) => {
      s.budgets = s.budgets.filter((b) => b.id !== id);
    }),

  goals: () =>
    read((s) =>
      (s.goals ?? []).map((g) => ({
        ...g,
        savedMinor: g.accountId
          ? (() => {
              const account = s.accounts.find((a) => a.id === g.accountId);
              return account ? account.openingBalanceMinor + account.flowMinor : 0;
            })()
          : (s.contributions ?? [])
              .filter((c) => c.goalId === g.id)
              .reduce((sum, c) => sum + c.amountMinor, 0),
      })),
    ).then((goals) => goals.sort((a, b) => a.order - b.order)),
  createGoal: (input) =>
    change((s) => {
      if (input.accountId) {
        const account = s.accounts.find((a) => a.id === input.accountId);
        if (!account) throw notFound("account");
        if (account.currency !== (input.currency ?? s.profile.baseCurrency)) {
          throw invalid("The account is in another currency");
        }
      }
      const at = stamp();
      const goal = {
        name: input.name,
        targetMinor: input.targetMinor,
        currency: input.currency ?? s.profile.baseCurrency,
        targetDate: input.targetDate ?? null,
        accountId: input.accountId ?? null,
        icon: input.icon ?? "piggy-bank",
        colour: input.colour ?? "teal",
        archived: false,
        order: (s.goals ?? []).length,
        id: newId(),
        createdAt: at,
        updatedAt: at,
      };
      (s.goals ??= []).push(goal);
      return goal;
    }).then(async (goal) => (await demoSource.goals()).find((g) => g.id === goal.id)!),
  updateGoal: (id, patch) =>
    change((s) => {
      const goal = (s.goals ?? []).find((g) => g.id === id);
      if (!goal) throw notFound("goal");
      Object.assign(goal, patch, { updatedAt: stamp() });
    }).then(async () => (await demoSource.goals()).find((g) => g.id === id)!),
  deleteGoal: (id) =>
    change((s) => {
      s.goals = (s.goals ?? []).filter((g) => g.id !== id);
      s.contributions = (s.contributions ?? []).filter((c) => c.goalId !== id);
    }),
  contributions: (goalId) =>
    read((s) =>
      (s.contributions ?? [])
        .filter((c) => c.goalId === goalId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    ),
  contribute: (goalId, input) =>
    change((s) => {
      const goal = (s.goals ?? []).find((g) => g.id === goalId);
      if (!goal) throw notFound("goal");
      if (goal.accountId) throw new DataError(409, "conflict", "The goal follows an account");
      if (!Number.isInteger(input.amountMinor) || input.amountMinor === 0) throw invalid("Amount");
      const contribution: Contribution = {
        id: newId(),
        goalId,
        amountMinor: input.amountMinor,
        date: input.date,
        note: input.note ?? "",
        createdAt: stamp(),
      };
      (s.contributions ??= []).push(contribution);
      return contribution;
    }),
  deleteContribution: (goalId, id) =>
    change((s) => {
      s.contributions = (s.contributions ?? []).filter(
        (c) => !(c.goalId === goalId && c.id === id),
      );
    }),

  importV1: () => Promise.reject(new DataError(409, "conflict", "The demo has no version 1 data")),
};

/** Days of the demo that are "today" relative: kept for tests. */
export const demoWindow = () => ({ from: addDays(addMonths(today(), -12), 0), to: today() });
