import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/i18n.tsx";
import { paletteKeys } from "@/lib/keyboard.ts";

/** The list of keyboard shortcuts, opened with "?" or from the palette. */
export default function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const rows: [string, string][] = [
    [paletteKeys(), t.shortcuts.palette],
    ["/", t.shortcuts.palette],
    ["N", t.shortcuts.newTransaction],
    ["?", t.shortcuts.help],
    ["Esc", t.shortcuts.close],
  ];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-in-fade bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="glass fixed inset-x-3 top-[15dvh] z-50 mx-auto max-w-md animate-in-sheet rounded-[1.5rem] border border-border p-5 shadow-float">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold tracking-tight">
              {t.shortcuts.title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t.close}
              className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-3 text-sm text-muted">
            {t.shortcuts.lead}
          </Dialog.Description>
          <dl className="divide-y divide-border">
            {rows.map(([keys, what]) => (
              <div key={keys} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-sm">{what}</dt>
                <dd>
                  <kbd className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs font-bold">
                    {keys}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 rounded-2xl bg-accent-soft p-3 text-sm">{t.shortcuts.example}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
