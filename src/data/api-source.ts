import type { DataSource, RatesSource } from "./source.ts";
import { DataError, type ApiErrorBody, type TransactionQuery } from "./types.ts";

/** The API lives on the same origin (/api, rewritten by Firebase Hosting); VITE_API_URL points elsewhere. */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "/api";

type TokenGetter = () => Promise<string | null>;

async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
  token?: TokenGetter,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.json !== undefined) headers.set("Content-Type", "application/json");
  const bearer = token ? await token() : null;
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
      body: init.json === undefined ? init.body : JSON.stringify(init.json),
    });
  } catch {
    throw new DataError(0, "offline", "No connection");
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new DataError(res.status, error?.code ?? "internal", error?.message ?? res.statusText);
  }
  return body as T;
}

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const ratesSource: RatesSource = {
  mid: (date) => request(`/rates${query({ date })}`),
  cash: () => request("/rates/cash"),
  history: (code, from, to) => request(`/rates/history${query({ code, from, to })}`),
};

/** The signed-in user's data; every request carries a fresh Firebase ID token. */
export function apiSource(token: TokenGetter): DataSource {
  const get = <T>(path: string) => request<T>(path, {}, token);
  const send = <T>(method: string, path: string, json?: unknown) =>
    request<T>(path, { method, json }, token);

  return {
    kind: "api",
    me: () => get("/me"),
    updateProfile: (patch) => send("PATCH", "/me/profile", patch),

    accounts: () => get("/accounts"),
    createAccount: (input) => send("POST", "/accounts", input),
    updateAccount: (id, patch) => send("PATCH", `/accounts/${id}`, patch),
    deleteAccount: (id) => send("DELETE", `/accounts/${id}`),

    categories: () => get("/categories"),
    createCategory: (input) => send("POST", "/categories", input),
    updateCategory: (id, patch) => send("PATCH", `/categories/${id}`, patch),
    deleteCategory: (id) => send("DELETE", `/categories/${id}`),

    transactions: (q: TransactionQuery) => get(`/transactions${query({ ...q })}`),
    createTransaction: (input) => send("POST", "/transactions", input),
    updateTransaction: (id, patch) => send("PATCH", `/transactions/${id}`, patch),
    deleteTransaction: (id) => send("DELETE", `/transactions/${id}`),

    budgets: () => get("/budgets"),
    createBudget: (input) => send("POST", "/budgets", input),
    updateBudget: (id, patch) => send("PATCH", `/budgets/${id}`, patch),
    deleteBudget: (id) => send("DELETE", `/budgets/${id}`),

    importV1: () => send("POST", "/import/v1"),
  };
}
