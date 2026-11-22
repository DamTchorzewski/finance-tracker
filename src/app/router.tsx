import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import errorArt from "@/assets/illustrations/error.svg?raw";
import notFoundArt from "@/assets/illustrations/not-found.svg?raw";
import offlineArt from "@/assets/illustrations/offline.svg?raw";
import { useSession } from "@/auth/session.tsx";
import { Illustration } from "@/components/brand/illustration.tsx";
import { buttonStyles } from "@/components/ui/button.tsx";
import { DataError, type TxKind } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { PERIODS, type PeriodKey } from "@/lib/dates.ts";
import { AppShell, FullPageSpinner } from "./shell.tsx";

const AuthPage = lazy(() => import("@/features/auth/auth-page.tsx"));
const DashboardPage = lazy(() => import("@/features/dashboard/dashboard-page.tsx"));
const TransactionsPage = lazy(() => import("@/features/transactions/transactions-page.tsx"));
const AccountsPage = lazy(() => import("@/features/accounts/accounts-page.tsx"));
const BudgetsPage = lazy(() => import("@/features/budgets/budgets-page.tsx"));
const CurrenciesPage = lazy(() => import("@/features/currencies/currencies-page.tsx"));
const SettingsPage = lazy(() => import("@/features/settings/settings-page.tsx"));
const ReportPage = lazy(() => import("@/features/report/report-page.tsx"));
const GoalsPage = lazy(() => import("@/features/goals/goals-page.tsx"));

// The search parameters are checked by hand (a wrong value is dropped, not an error), so the router does not pull a
// schema library into the first load.
const KINDS: TxKind[] = ["expense", "income", "transfer"];
const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);
const oneOf = <T extends string>(list: readonly T[], value: unknown) =>
  list.includes(value as T) ? (value as T) : undefined;

function NotFound() {
  const { t } = useI18n();
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Illustration svg={notFoundArt} className="w-60" />
        <h1 className="text-2xl font-bold">{t.notFound.title}</h1>
        <p className="text-muted">{t.notFound.lead}</p>
        <Link to="/" className={buttonStyles({ className: "mt-2" })}>
          {t.notFound.home}
        </Link>
      </div>
    </main>
  );
}

/** A route that failed: offline (the API could not be reached) or any other error, with a retry. */
function RouteError({ error, reset }: { error: unknown; reset: () => void }) {
  const { t } = useI18n();
  const offline =
    (error instanceof DataError && error.code === "offline") ||
    (typeof navigator !== "undefined" && !navigator.onLine);
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Illustration svg={offline ? offlineArt : errorArt} className="w-60" />
        <h1 className="text-2xl font-bold">
          {offline ? t.errorPage.offlineTitle : t.errorPage.title}
        </h1>
        <p className="max-w-sm text-muted">
          {offline ? t.errorPage.offlineLead : t.errorPage.lead}
        </p>
        <button type="button" onClick={reset} className={buttonStyles({ className: "mt-2" })}>
          {t.errorPage.retry}
        </button>
      </div>
    </main>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <Suspense fallback={<FullPageSpinner />}>
      <Outlet />
    </Suspense>
  ),
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

/** The sign-in pages: a signed-in user (or the demo) goes straight to the dashboard. */
function PublicOnly({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { session } = useSession();
  if (session.status === "loading") return <FullPageSpinner />;
  if (session.status !== "signed-out") return <Navigate to="/" />;
  return <AuthPage mode={mode} />;
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (
    search: Record<string, unknown>,
  ): { confirmed?: number; mode?: string; oobCode?: string } => ({
    confirmed: search.confirmed ? 1 : undefined,
    mode: text(search.mode),
    oobCode: text(search.oobCode),
  }),
  component: () => <PublicOnly mode="sign-in" />,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: () => <PublicOnly mode="sign-up" />,
});

/** Everything behind the sign-in shares the shell. */
function Protected() {
  const { session } = useSession();
  if (session.status === "loading") return <FullPageSpinner />;
  if (session.status === "signed-out") return <Navigate to="/login" />;
  return <AppShell />;
}

const appRoute = createRoute({ getParentRoute: () => rootRoute, id: "app", component: Protected });

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>): { period?: PeriodKey; add?: TxKind } => ({
    period: oneOf(PERIODS, search.period),
    add: oneOf(KINDS, search.add),
  }),
  component: DashboardPage,
});

export interface TransactionsSearch {
  period?: PeriodKey;
  account?: string;
  category?: string;
  kind?: TxKind;
  q?: string;
}

const transactionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/transactions",
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => ({
    period: oneOf(PERIODS, search.period),
    account: text(search.account),
    category: text(search.category),
    kind: oneOf(KINDS, search.kind),
    q: text(search.q),
  }),
  component: TransactionsPage,
});

const accountsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/accounts",
  component: AccountsPage,
});
const budgetsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/budgets",
  component: BudgetsPage,
});
const currenciesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/currencies",
  validateSearch: (search: Record<string, unknown>): { code?: string } => ({
    code:
      typeof search.code === "string" && /^[A-Z]{3}$/.test(search.code) ? search.code : undefined,
  }),
  component: CurrenciesPage,
});
const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: SettingsPage,
});

const goalsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/goals",
  component: GoalsPage,
});

const reportRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/report",
  validateSearch: (search: Record<string, unknown>): { month?: string } => ({
    month:
      typeof search.month === "string" && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : undefined,
  }),
  component: ReportPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  appRoute.addChildren([
    dashboardRoute,
    transactionsRoute,
    accountsRoute,
    budgetsRoute,
    currenciesRoute,
    settingsRoute,
    reportRoute,
    goalsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
