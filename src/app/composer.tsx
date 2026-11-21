import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Transaction, TxKind } from "@/data/types.ts";

const TransactionSheet = lazy(() => import("@/features/transactions/transaction-sheet.tsx"));

export interface Draft {
  kind?: TxKind;
  amountMinor?: number;
  categoryId?: string | null;
  date?: string;
  note?: string;
  accountId?: string;
}

interface Composer {
  /** Opens the transaction form: empty, prefilled (quick add) or for an existing transaction. */
  open: (input?: { draft?: Draft; edit?: Transaction }) => void;
}

const Context = createContext<Composer | null>(null);

/** One transaction form for the whole app: the dock, the palette, the dashboard and the list all open it. */
export function ComposerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    draft?: Draft;
    edit?: Transaction;
    key: number;
  }>({
    open: false,
    key: 0,
  });

  const open = useCallback<Composer["open"]>(
    (input) =>
      setState((old) => ({ open: true, draft: input?.draft, edit: input?.edit, key: old.key + 1 })),
    [],
  );
  const value = useMemo(() => ({ open }), [open]);

  return (
    <Context.Provider value={value}>
      {children}
      {state.key > 0 && (
        <Suspense fallback={null}>
          <TransactionSheet
            key={state.key}
            open={state.open}
            draft={state.draft}
            edit={state.edit}
            onOpenChange={(next) => setState((old) => ({ ...old, open: next }))}
          />
        </Suspense>
      )}
    </Context.Provider>
  );
}

export function useComposer() {
  const value = useContext(Context);
  if (!value) throw new Error("useComposer needs <ComposerProvider>");
  return value;
}
