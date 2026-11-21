// The shapes of the API, generated from finance-tracker-api's openapi.json (`pnpm api:types`).
import type { components } from "@/api/schema";

type S = components["schemas"];

export type Profile = S["Profile"];
export type ProfilePatch = S["ProfilePatch"];
export type Me = S["Me"];
export type Account = S["Account"];
export type AccountCreate = S["AccountCreate"];
export type AccountPatch = S["AccountPatch"];
export type Category = S["Category"];
export type CategoryCreate = S["CategoryCreate"];
export type CategoryPatch = S["CategoryPatch"];
export type Transaction = S["Transaction"];
export type TransactionCreate = S["TransactionCreate"];
export type TransactionPatch = S["TransactionPatch"];
export type Budget = S["Budget"];
export type BudgetCreate = S["BudgetCreate"];
export type BudgetPatch = S["BudgetPatch"];
export type MidTable = S["MidTable"];
export type CashTable = S["CashTable"];
export type RateHistory = S["RateHistory"];
export type ImportResult = S["ImportResult"];
export type ApiErrorBody = S["Error"];

export type TxKind = Transaction["kind"];
export type CategoryColour = Category["colour"];
export type WidgetKey = Profile["widgets"][number];

export interface TransactionQuery {
  from: string;
  to: string;
  accountId?: string;
  categoryId?: string;
  kind?: TxKind;
  q?: string;
}

/** What the API answers with an error, thrown by both data sources. */
export class DataError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "DataError";
    this.status = status;
    this.code = code;
  }
}
