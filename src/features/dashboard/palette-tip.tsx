import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { useI18n } from "@/i18n/i18n.tsx";
import { hasKeyboard, openPalette, paletteKeys } from "@/lib/keyboard.ts";

const SEEN_KEY = "ft-tip-palette";

const seen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
};

/** A one-time tip about the command palette and quick add; it stays hidden once dismissed or tried. */
export function PaletteTip() {
  const { t, fill } = useI18n();
  const [hidden, setHidden] = useState(seen);
  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // shown again next visit
    }
    setHidden(true);
  };

  return (
    <aside
      aria-labelledby="palette-tip"
      className="relative mb-4 flex flex-col gap-3 overflow-hidden rounded-card border border-accent/30 bg-accent-soft p-4 sm:flex-row sm:items-center"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Sparkles aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1 pr-8 sm:pr-0">
        <h2 id="palette-tip" className="font-bold">
          {t.shortcuts.tipTitle}
        </h2>
        <p className="mt-0.5 text-sm">
          {hasKeyboard()
            ? fill(t.shortcuts.tipText, { keys: paletteKeys() })
            : t.shortcuts.tipTouch}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            dismiss();
            openPalette();
          }}
        >
          {t.shortcuts.tryIt}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss} className="max-sm:hidden">
          {t.shortcuts.gotIt}
        </Button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.shortcuts.gotIt}
        className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-muted hover:bg-surface sm:hidden"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </aside>
  );
}
