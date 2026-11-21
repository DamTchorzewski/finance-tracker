import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Coins,
  Eye,
  EyeOff,
  Landmark,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/auth/session.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import { resetDemo } from "@/data/demo-source.ts";
import { useMe, useUpdateProfile } from "@/data/queries.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { isTyping, paletteKeys } from "@/lib/keyboard.ts";
import { ComposerProvider, useComposer } from "./composer.tsx";
import { usePrefs } from "./prefs.ts";

const CommandPalette = lazy(() => import("@/features/palette/command-palette.tsx"));
const ShortcutsDialog = lazy(() => import("@/features/palette/shortcuts-dialog.tsx"));

type NavKey = "home" | "transactions" | "budgets" | "accounts" | "currencies" | "settings";

const NAV: { key: NavKey; to: string; icon: LucideIcon }[] = [
  { key: "home", to: "/", icon: LayoutDashboard },
  { key: "transactions", to: "/transactions", icon: ArrowLeftRight },
  { key: "budgets", to: "/budgets", icon: Target },
  { key: "accounts", to: "/accounts", icon: Landmark },
  { key: "currencies", to: "/currencies", icon: Coins },
  { key: "settings", to: "/settings", icon: Settings },
];

export function FullPageSpinner() {
  const { t } = useI18n();
  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-[3px] border-accent border-t-transparent motion-reduce:animate-none" />
        <span className="text-sm text-muted">{t.loading}</span>
      </div>
    </div>
  );
}

function Logo({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-xl" aria-label={t.appName}>
      <img src="/icon.svg" alt="" width={36} height={36} className="size-9 rounded-xl" />
      {!compact && <span className="text-[15px] font-extrabold tracking-tight">{t.appName}</span>}
    </Link>
  );
}

/** Greets by the time of day in Warsaw and by name, when the user gave one. */
function useGreeting(name: string | null | undefined) {
  const { t } = useI18n();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/Warsaw",
    }).format(new Date()),
  );
  const part =
    hour < 5
      ? "night"
      : hour < 12
        ? "morning"
        : hour < 18
          ? "afternoon"
          : hour < 23
            ? "evening"
            : "night";
  return name ? `${t.greeting[part]}, ${name}` : t.greeting[part];
}

function SideRail({ onPalette }: { onPalette: () => void }) {
  const { t } = useI18n();
  const composer = useComposer();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-surface/60 px-3 py-5 md:flex lg:w-64 lg:px-4 print:hidden">
      <div className="px-1.5 lg:px-2">
        <span className="lg:hidden">
          <Logo compact />
        </span>
        <span className="hidden lg:inline">
          <Logo />
        </span>
      </div>
      <Button
        size="lg"
        className="w-full justify-center lg:justify-start"
        onClick={() => composer.open()}
        aria-label={t.tx.new}
      >
        <Plus aria-hidden="true" />
        <span className="hidden lg:inline">{t.tx.new}</span>
      </Button>
      <nav aria-label={t.nav.main} className="flex flex-col gap-1">
        {NAV.map(({ key, to, icon: Icon }) => (
          <Link
            key={key}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex h-11 items-center justify-center gap-3 rounded-2xl px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground data-[status=active]:bg-accent-soft data-[status=active]:text-foreground lg:justify-start"
            title={t.nav[key]}
          >
            <Icon aria-hidden="true" className="size-5" />
            <span className="hidden lg:inline">{t.nav[key]}</span>
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={onPalette}
        className="mt-auto hidden items-center gap-2 rounded-2xl border border-border px-3 py-2.5 text-sm text-muted hover:text-foreground lg:flex"
      >
        <Search aria-hidden="true" className="size-4" />
        {t.palette.open}
        <kbd className="ml-auto rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap">
          {paletteKeys()}
        </kbd>
      </button>
    </aside>
  );
}

function Dock({ onMore }: { onMore: () => void }) {
  const { t } = useI18n();
  const composer = useComposer();
  const item =
    "text-muted data-[status=active]:text-accent flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold";
  return (
    <nav
      aria-label={t.nav.main}
      className="glass safe-bottom fixed inset-x-3 bottom-3 z-30 flex items-center gap-1 rounded-[1.6rem] border border-border px-2 shadow-float md:hidden print:hidden"
    >
      <Link to="/" activeOptions={{ exact: true }} className={item}>
        <LayoutDashboard aria-hidden="true" className="size-5" />
        {t.nav.home}
      </Link>
      <Link to="/transactions" className={item}>
        <ArrowLeftRight aria-hidden="true" className="size-5" />
        {t.nav.transactions}
      </Link>
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={() => composer.open()}
          aria-label={t.tx.new}
          className="-mt-7 grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-float transition-transform active:scale-95"
        >
          <Plus aria-hidden="true" className="size-6" />
        </button>
      </div>
      <Link to="/budgets" className={item}>
        <Target aria-hidden="true" className="size-5" />
        {t.nav.budgets}
      </Link>
      <button type="button" onClick={onMore} className={item}>
        <Settings aria-hidden="true" className="size-5" />
        {t.nav.more}
      </button>
    </nav>
  );
}

function TopBar({ name, onPalette }: { name: string | null | undefined; onPalette: () => void }) {
  const { t } = useI18n();
  const { session } = useSession();
  const { data } = useMe();
  const update = useUpdateProfile();
  const client = useQueryClient();
  const greeting = useGreeting(name);
  const profile = data?.profile;
  const darkNow =
    profile?.theme === "dark" ||
    (profile?.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border px-4 md:px-6 print:hidden">
      <span className="md:hidden">
        <Logo compact />
      </span>
      <p className="min-w-0 truncate text-sm font-semibold text-muted max-md:sr-only">{greeting}</p>
      {session.status === "demo" && (
        <span className="ml-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
          {t.demo.badge}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        {session.status === "demo" && profile && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.demo.reset}
            title={t.demo.reset}
            onClick={async () => {
              resetDemo(profile.locale);
              await client.invalidateQueries({ queryKey: ["demo"] });
              toast.success(t.demo.resetDone);
            }}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        )}
        <button
          type="button"
          onClick={onPalette}
          aria-keyshortcuts="Control+K Meta+K"
          className="mr-1 hidden h-10 w-48 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm text-muted transition-colors hover:border-muted hover:text-foreground md:flex lg:w-72"
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="truncate">{t.palette.searchOrAdd}</span>
          <kbd className="ml-auto rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap">
            {paletteKeys()}
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.palette.open}
          onClick={onPalette}
          className="md:hidden"
        >
          <Search aria-hidden="true" />
        </Button>
        {profile && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.privacy}
              aria-pressed={profile.privacyMode}
              onClick={() => update.mutate({ privacyMode: !profile.privacyMode })}
            >
              {profile.privacyMode ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.palette.toggleTheme}
              onClick={() => update.mutate({ theme: darkNow ? "light" : "dark" })}
            >
              {darkNow ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

function MoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { signOut } = useSession();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.nav.more}>
      <nav aria-label={t.nav.more} className="flex flex-col gap-1 pb-2">
        {NAV.filter((n) => ["accounts", "currencies", "settings"].includes(n.key)).map(
          ({ key, to, icon: Icon }) => (
            <Link
              key={key}
              to={to}
              onClick={() => onOpenChange(false)}
              className="flex h-14 items-center gap-3 rounded-2xl px-3 font-semibold hover:bg-surface-2"
            >
              <Icon aria-hidden="true" className="size-5 text-accent" />
              {t.nav[key]}
            </Link>
          ),
        )}
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex h-14 items-center gap-3 rounded-2xl px-3 font-semibold text-negative hover:bg-surface-2"
        >
          <LogOut aria-hidden="true" className="size-5" />
          {t.auth.signOut}
        </button>
      </nav>
    </Sheet>
  );
}

/** Applies the profile (look and language) as soon as it is known. */
function ProfileSync() {
  const { data } = useMe();
  const { setLocale } = useI18n();
  const profile = data?.profile;
  usePrefs(
    profile && {
      theme: profile.theme,
      accentHue: profile.accentHue,
      privacyMode: profile.privacyMode,
      locale: profile.locale,
    },
  );
  useEffect(() => {
    if (profile) setLocale(profile.locale);
  }, [profile, setLocale]);
  return null;
}

/**
 * Ctrl K or ⌘K (anywhere) and "/" open the palette, "N" a new transaction, "?" the list of shortcuts. The single keys
 * stay quiet while the user types in a field or a dialog is open.
 */
function KeyboardShortcuts({ onPalette, onHelp }: { onPalette: () => void; onHelp: () => void }) {
  const composer = useComposer();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onPalette();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event)) return;
      if (event.key === "/") {
        event.preventDefault();
        onPalette();
      } else if (event.key === "?") {
        event.preventDefault();
        onHelp();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        composer.open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPalette, onHelp, composer]);
  return null;
}

export function AppShell() {
  const { t } = useI18n();
  const { data } = useMe();
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [more, setMore] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });

  // other parts of the app (the dashboard tip) ask for the palette with an event
  useEffect(() => {
    const open = () => setPalette(true);
    window.addEventListener("ft:palette", open);
    return () => window.removeEventListener("ft:palette", open);
  }, []);

  return (
    <ComposerProvider>
      <ProfileSync />
      <KeyboardShortcuts
        onPalette={() => setPalette((open) => !open)}
        onHelp={() => setShortcuts(true)}
      />
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-accent px-4 py-2 font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.skipToContent}
      </a>
      <div className="md:flex">
        <SideRail onPalette={() => setPalette(true)} />
        <div className="min-w-0 flex-1">
          <TopBar
            name={data?.profile.displayName ?? data?.user.name}
            onPalette={() => setPalette(true)}
          />
          <main
            id="main"
            key={path}
            className="mx-auto w-full max-w-6xl animate-rise px-4 pt-5 pb-32 md:px-6 md:pb-12 print:max-w-none print:animate-none print:p-0"
          >
            <Suspense fallback={<FullPageSpinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <Dock onMore={() => setMore(true)} />
      <MoreSheet open={more} onOpenChange={setMore} />
      {palette && (
        <Suspense fallback={null}>
          <CommandPalette
            open={palette}
            onOpenChange={setPalette}
            onShortcuts={() => setShortcuts(true)}
          />
        </Suspense>
      )}
      {shortcuts && (
        <Suspense fallback={null}>
          <ShortcutsDialog open={shortcuts} onOpenChange={setShortcuts} />
        </Suspense>
      )}
    </ComposerProvider>
  );
}
