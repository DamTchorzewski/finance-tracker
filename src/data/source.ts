import type {
  Account,
  AccountCreate,
  AccountPatch,
  Budget,
  BudgetCreate,
  BudgetPatch,
  CashTable,
  Category,
  CategoryCreate,
  CategoryPatch,
  Contribution,
  ContributionCreate,
  Goal,
  GoalCreate,
  GoalPatch,
  ImportResult,
  Me,
  MidTable,
  Profile,
  ProfilePatch,
  RateHistory,
  Transaction,
  TransactionCreate,
  TransactionPatch,
  TransactionQuery,
} from "./types.ts";

/**
 * Everything the screens read and write. Two implementations with the same behaviour: the API of the signed-in
 * user (api-source.ts) and the demo kept in this browser (demo-source.ts). The screens never know which one runs.
 */
export interface DataSource {
  readonly kind: "api" | "demo";

  me(): Promise<Me>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;

  accounts(): Promise<Account[]>;
  createAccount(input: AccountCreate): Promise<Account>;
  updateAccount(id: string, patch: AccountPatch): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  categories(): Promise<Category[]>;
  createCategory(input: CategoryCreate): Promise<Category>;
  updateCategory(id: string, patch: CategoryPatch): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  transactions(query: TransactionQuery): Promise<Transaction[]>;
  createTransaction(input: TransactionCreate): Promise<Transaction>;
  updateTransaction(id: string, patch: TransactionPatch): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  budgets(): Promise<Budget[]>;
  createBudget(input: BudgetCreate): Promise<Budget>;
  updateBudget(id: string, patch: BudgetPatch): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;

  goals(): Promise<Goal[]>;
  createGoal(input: GoalCreate): Promise<Goal>;
  updateGoal(id: string, patch: GoalPatch): Promise<Goal>;
  deleteGoal(id: string): Promise<void>;
  contributions(goalId: string): Promise<Contribution[]>;
  contribute(goalId: string, input: ContributionCreate): Promise<Contribution>;
  deleteContribution(goalId: string, id: string): Promise<void>;

  importV1(): Promise<ImportResult>;
}

/** The rates are public: both sources read them from the API (the demo too, through the CDN). */
export interface RatesSource {
  mid(date?: string): Promise<MidTable>;
  cash(): Promise<CashTable>;
  history(code: string, from: string, to: string): Promise<RateHistory>;
}
