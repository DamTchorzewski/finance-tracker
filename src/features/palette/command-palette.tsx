import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Dialog } from "radix-ui";
import {
  ArrowLeftRight,
  Coins,
  Eye,
  Landmark,
  LayoutDashboard,
  Minus,
  Moon,
  Plus,
  Shapes,
  Keyboard,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useComposer } from "@/app/composer.tsx";
import { useCategories, useMe, useUpdateProfile } from "@/data/queries.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { formatDay } from "@/lib/dates.ts";
import { formatMoney } from "@/lib/money.ts";
import { parseQuickAdd } from "@/lib/quick-add.ts";

/** Ctrl K: go anywhere, run any action, or add a transaction by typing it in plain words. */
export default function CommandPalette({
  open,
  onOpenChange,
  onShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShortcuts?: () => void;
}) {
  const { t, fill, locale } = useI18n();
  const navigate = useNavigate();
  const composer = useComposer();
  const categories = useCategories().data ?? [];
  const profile = useMe().data?.profile;
  const update = useUpdateProfile();
  const [text, setText] = useState("");
  const quick = parseQuickAdd(text);

  const run = (action: () => void) => {
    onOpenChange(false);
    setText("");
    action();
  };

  const item =
    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold aria-selected:bg-accent-soft data-[disabled=true]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted";
  const pages = [
    { to: "/", label: t.nav.home, icon: LayoutDashboard },
    { to: "/transactions", label: t.nav.transactions, icon: ArrowLeftRight },
    { to: "/budgets", label: t.nav.budgets, icon: Target },
    { to: "/accounts", label: t.nav.accounts, icon: Landmark },
    { to: "/currencies", label: t.nav.currencies, icon: Coins },
    { to: "/settings", label: t.nav.settings, icon: Settings },
  ] as const;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-in-fade bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="glass fixed inset-x-3 top-[12dvh] z-50 mx-auto max-w-xl animate-in-sheet overflow-hidden rounded-[1.5rem] border border-border shadow-float">
          <Dialog.Title className="sr-only">{t.palette.open}</Dialog.Title>
          <Dialog.Description className="sr-only">{t.palette.placeholder}</Dialog.Description>
          <Command label={t.palette.open} shouldFilter={!quick} loop>
            <Command.Input
              value={text}
              onValueChange={setText}
              placeholder={t.palette.placeholder}
              className="h-14 w-full border-b border-border bg-transparent px-5 text-base outline-none placeholder:text-muted"
            />
            <Command.List className="max-h-[50dvh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
                {t.palette.noResults}
              </Command.Empty>

              {quick && (
                <Command.Group
                  heading={t.add}
                  className="px-1 text-xs font-bold text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  <Command.Item
                    value={`quick ${text}`}
                    className={item}
                    onSelect={() =>
                      run(() =>
                        composer.open({
                          draft: {
                            kind: quick.kind,
                            amountMinor: quick.amountMinor,
                            date: quick.date,
                            note: quick.note,
                            categoryId:
                              categories.find((c) => c.key === quick.categoryKey)?.id ?? null,
                          },
                        }),
                      )
                    }
                  >
                    <Sparkles />
                    <span className="text-foreground">
                      {fill(t.palette.quickAdd, {
                        text: `${quick.kind === "income" ? "+" : "−"}${formatMoney(quick.amountMinor, "PLN", locale)} · ${quick.note || "—"} · ${formatDay(quick.date, locale)}`,
                      })}
                    </span>
                  </Command.Item>
                </Command.Group>
              )}

              <Command.Group
                heading={t.palette.actions}
                className="px-1 text-xs font-bold text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                <Command.Item
                  className={item}
                  onSelect={() => run(() => composer.open({ draft: { kind: "expense" } }))}
                >
                  <Minus />
                  <span className="text-foreground">{t.palette.newExpense}</span>
                </Command.Item>
                <Command.Item
                  className={item}
                  onSelect={() => run(() => composer.open({ draft: { kind: "income" } }))}
                >
                  <Plus />
                  <span className="text-foreground">{t.palette.newIncome}</span>
                </Command.Item>
                <Command.Item
                  className={item}
                  onSelect={() => run(() => composer.open({ draft: { kind: "transfer" } }))}
                >
                  <ArrowLeftRight />
                  <span className="text-foreground">{t.palette.newTransfer}</span>
                </Command.Item>
                <Command.Item className={item} onSelect={() => run(() => composer.openCategory())}>
                  <Shapes />
                  <span className="text-foreground">{t.palette.newCategory}</span>
                </Command.Item>
                {onShortcuts && (
                  <Command.Item className={item} onSelect={() => run(onShortcuts)}>
                    <Keyboard />
                    <span className="text-foreground">{t.shortcuts.title}</span>
                  </Command.Item>
                )}
                {profile && (
                  <>
                    <Command.Item
                      className={item}
                      onSelect={() =>
                        run(() =>
                          update.mutate({
                            theme:
                              document.documentElement.dataset.theme === "dark" ? "light" : "dark",
                          }),
                        )
                      }
                    >
                      <Moon />
                      <span className="text-foreground">{t.palette.toggleTheme}</span>
                    </Command.Item>
                    <Command.Item
                      className={item}
                      onSelect={() =>
                        run(() => update.mutate({ privacyMode: !profile.privacyMode }))
                      }
                    >
                      <Eye />
                      <span className="text-foreground">{t.palette.togglePrivacy}</span>
                    </Command.Item>
                  </>
                )}
              </Command.Group>

              <Command.Group
                heading={t.palette.go}
                className="px-1 text-xs font-bold text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {pages.map(({ to, label, icon: Icon }) => (
                  <Command.Item
                    key={to}
                    className={item}
                    onSelect={() => run(() => void navigate({ to }))}
                  >
                    <Icon />
                    <span className="text-foreground">{label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-5 py-2.5 text-xs text-muted">
              <span>{t.palette.footerQuick}</span>
              <span className="ml-auto hidden sm:inline">↑↓ · Enter · Esc</span>
            </p>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
