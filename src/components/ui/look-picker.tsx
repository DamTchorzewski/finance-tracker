import type { CategoryColour } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import { CATEGORY_ICONS, colourVar } from "@/lib/icons.ts";

/** The colour of a category or a goal. */
export function ColourPicker({
  colours,
  value,
  onChange,
}: {
  colours: readonly CategoryColour[];
  value: CategoryColour;
  onChange: (colour: CategoryColour) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{t.categories.colour}</legend>
      <div className="flex flex-wrap gap-2">
        {colours.map((colour) => (
          <button
            key={colour}
            type="button"
            aria-label={t.categories.colours[colour]}
            aria-pressed={colour === value}
            onClick={() => onChange(colour)}
            className={cn(
              "size-9 rounded-full ring-offset-2 ring-offset-[var(--surface)]",
              colour === value && "ring-2 ring-foreground",
            )}
            style={{ background: colourVar(colour) }}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** The icon of a category or a goal, by its name in CATEGORY_ICONS. */
export function IconPicker({
  icons,
  value,
  onChange,
  className,
}: {
  icons: readonly string[];
  value: string;
  onChange: (icon: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{t.categories.icon}</legend>
      <div className={cn("grid grid-cols-6 gap-2", className)}>
        {icons.map((name) => {
          const Icon = CATEGORY_ICONS[name];
          return Icon ? (
            <button
              key={name}
              type="button"
              aria-label={name.replaceAll("-", " ")}
              aria-pressed={name === value}
              onClick={() => onChange(name)}
              className={cn(
                "grid aspect-square place-items-center rounded-xl border transition-colors",
                name === value
                  ? "border-accent bg-accent-soft"
                  : "border-border hover:bg-surface-2",
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
            </button>
          ) : null;
        })}
      </div>
    </fieldset>
  );
}
