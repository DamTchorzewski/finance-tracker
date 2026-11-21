import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSource } from "@/auth/session.tsx";
import { ratesSource } from "./api-source.ts";
import type {
  AccountCreate,
  AccountPatch,
  BudgetCreate,
  BudgetPatch,
  CategoryCreate,
  CategoryPatch,
  ContributionCreate,
  GoalCreate,
  GoalPatch,
  Me,
  ProfilePatch,
  TransactionCreate,
  TransactionPatch,
  TransactionQuery,
} from "./types.ts";

// One place for the server state. The keys start with the source's kind, so the demo and a real account never share
// a cached answer. Every change invalidates what it can change (a transaction moves account balances too).

const useKey = () => useSource().kind;

export function useMe() {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, "me"],
    queryFn: () => source.me(),
    staleTime: 5 * 60_000,
  });
}

export function useAccounts() {
  const source = useSource();
  return useQuery({ queryKey: [source.kind, "accounts"], queryFn: () => source.accounts() });
}

export function useCategories() {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, "categories"],
    queryFn: () => source.categories(),
    staleTime: 10 * 60_000,
  });
}

export function useTransactions(query: TransactionQuery) {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, "transactions", query],
    queryFn: () => source.transactions(query),
    placeholderData: keepPreviousData,
  });
}

export function useBudgets() {
  const source = useSource();
  return useQuery({ queryKey: [source.kind, "budgets"], queryFn: () => source.budgets() });
}

export function useRates(date?: string) {
  return useQuery({
    queryKey: ["rates", "mid", date ?? "today"],
    queryFn: () => ratesSource.mid(date),
    staleTime: 15 * 60_000,
    retry: 1,
  });
}

export function useCashRates() {
  return useQuery({
    queryKey: ["rates", "cash"],
    queryFn: () => ratesSource.cash(),
    staleTime: 15 * 60_000,
    retry: 1,
  });
}

export function useRateHistory(code: string, from: string, to: string) {
  return useQuery({
    queryKey: ["rates", "history", code, from, to],
    queryFn: () => ratesSource.history(code, from, to),
    staleTime: 60 * 60_000,
    enabled: code !== "PLN",
    retry: 1,
  });
}

function useInvalidate() {
  const client = useQueryClient();
  const kind = useKey();
  return (...parts: string[]) =>
    Promise.all(parts.map((part) => client.invalidateQueries({ queryKey: [kind, part] })));
}

export function useUpdateProfile() {
  const source = useSource();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => source.updateProfile(patch),
    // the theme, accent and privacy switch change at once; the server answer confirms them
    onMutate: async (patch) => {
      const key = [source.kind, "me"];
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<Me>(key);
      if (before)
        client.setQueryData<Me>(key, { ...before, profile: { ...before.profile, ...patch } });
      return { before };
    },
    onError: (_err, _patch, context) => {
      if (context?.before) client.setQueryData([source.kind, "me"], context.before);
    },
    onSettled: () => client.invalidateQueries({ queryKey: [source.kind, "me"] }),
  });
}

export function useAccountMutations() {
  const source = useSource();
  const invalidate = useInvalidate();
  const done = () => invalidate("accounts");
  return {
    create: useMutation({
      mutationFn: (input: AccountCreate) => source.createAccount(input),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: AccountPatch }) =>
        source.updateAccount(id, patch),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => source.deleteAccount(id), onSuccess: done }),
  };
}

export function useCategoryMutations() {
  const source = useSource();
  const invalidate = useInvalidate();
  const done = () => invalidate("categories");
  return {
    create: useMutation({
      mutationFn: (input: CategoryCreate) => source.createCategory(input),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: CategoryPatch }) =>
        source.updateCategory(id, patch),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => source.deleteCategory(id), onSuccess: done }),
  };
}

export function useTransactionMutations() {
  const source = useSource();
  const invalidate = useInvalidate();
  const done = () => invalidate("transactions", "accounts");
  return {
    create: useMutation({
      mutationFn: (input: TransactionCreate) => source.createTransaction(input),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TransactionPatch }) =>
        source.updateTransaction(id, patch),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) => source.deleteTransaction(id),
      onSuccess: done,
    }),
  };
}

export function useBudgetMutations() {
  const source = useSource();
  const invalidate = useInvalidate();
  const done = () => invalidate("budgets");
  return {
    create: useMutation({
      mutationFn: (input: BudgetCreate) => source.createBudget(input),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: BudgetPatch }) =>
        source.updateBudget(id, patch),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => source.deleteBudget(id), onSuccess: done }),
  };
}

export function useGoals() {
  const source = useSource();
  return useQuery({ queryKey: [source.kind, "goals"], queryFn: () => source.goals() });
}

export function useContributions(goalId: string | undefined) {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, "goals", goalId, "contributions"],
    queryFn: () => source.contributions(goalId!),
    enabled: Boolean(goalId),
  });
}

export function useGoalMutations() {
  const source = useSource();
  const invalidate = useInvalidate();
  const done = () => invalidate("goals");
  return {
    create: useMutation({
      mutationFn: (input: GoalCreate) => source.createGoal(input),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: GoalPatch }) => source.updateGoal(id, patch),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => source.deleteGoal(id), onSuccess: done }),
    contribute: useMutation({
      mutationFn: ({ goalId, input }: { goalId: string; input: ContributionCreate }) =>
        source.contribute(goalId, input),
      onSuccess: done,
    }),
    uncontribute: useMutation({
      mutationFn: ({ goalId, id }: { goalId: string; id: string }) =>
        source.deleteContribution(goalId, id),
      onSuccess: done,
    }),
  };
}

export function useImportV1() {
  const source = useSource();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => source.importV1(),
    onSuccess: () => invalidate("transactions", "accounts", "categories"),
  });
}
