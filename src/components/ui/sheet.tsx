import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";

/**
 * A panel for forms: it slides up from the bottom on a phone (thumb reach) and opens on the right on a wide screen.
 * Radix Dialog gives the name, the focus trap, Escape and the return of focus (standards/accessibility.md).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in-fade" />
        <Dialog.Content
          className={cn(
            "glass fixed z-50 flex flex-col overflow-hidden shadow-float outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet border-t border-border",
            "md:inset-y-3 md:right-3 md:left-auto md:max-h-none md:w-[440px] md:rounded-sheet md:border",
            "data-[state=open]:animate-in-sheet",
          )}
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border md:hidden"
          />
          <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
            <div>
              <Dialog.Title className="text-lg font-bold tracking-tight">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-muted">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={t.close}
              className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          {footer && (
            <footer className="safe-bottom border-t border-border px-5 py-3">{footer}</footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
