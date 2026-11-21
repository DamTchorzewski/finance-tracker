import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Field, Input, Segmented } from "@/components/ui/field.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import { useCategoryMutations } from "@/data/queries.ts";
import { DataError, type Category, type CategoryColour } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import { CATEGORY_ICONS, colourVar } from "@/lib/icons.ts";
import { CategoryBadge } from "../shared.tsx";

const COLOURS: CategoryColour[] = [
  "sage",
  "teal",
  "sky",
  "indigo",
  "violet",
  "plum",
  "rose",
  "coral",
  "amber",
  "lime",
  "sand",
  "slate",
];

/**
 * Add or change a category: name, kind, colour and icon, with a live preview. Opens from the settings, from the
 * transaction form (the new category is selected there at once) and from the command palette.
 */
export default function CategorySheet({
  category,
  defaultKind = "expense",
  open,
  onOpenChange,
  onCreated,
}: {
  category?: Category;
  defaultKind?: Category["kind"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (category: Category) => void;
}) {
  const { t } = useI18n();
  const { create, update } = useCategoryMutations();
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<Category["kind"]>(category?.kind ?? defaultKind);
  const [icon, setIcon] = useState(category?.icon ?? "shopping-bag");
  const [colour, setColour] = useState<CategoryColour>(category?.colour ?? "teal");
  const [error, setError] = useState<string>();
  const busy = create.isPending || update.isPending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!name.trim()) return setError(t.required);
    try {
      if (category) {
        await update.mutateAsync({ id: category.id, patch: { name: name.trim(), icon, colour } });
      } else {
        const created = await create.mutateAsync({ name: name.trim(), kind, icon, colour });
        onCreated?.(created);
        toast.success(`${t.categories.added}: ${created.name}`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof DataError ? err.message : t.somethingWrong);
    }
  }

  const preview = { icon, colour, name: name || t.categories.name } as Category;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={category ? category.name : t.categories.new}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button type="submit" form="category-form" className="flex-[2]" disabled={busy}>
            {t.save}
          </Button>
        </div>
      }
    >
      <form
        id="category-form"
        onSubmit={(event) => void submit(event)}
        noValidate
        className="flex flex-col gap-5 pt-1"
      >
        <div aria-hidden="true" className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <CategoryBadge category={preview} />
          <span className="truncate font-semibold">{preview.name}</span>
        </div>
        {!category && (
          <Segmented
            label={t.accounts.kind}
            value={kind}
            onChange={setKind}
            options={[
              { value: "expense", label: t.tx.expense },
              { value: "income", label: t.tx.income },
            ]}
          />
        )}
        <Field label={t.categories.name} error={error}>
          {(props) => (
            <Input
              {...props}
              autoFocus
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t.categories.colour}</legend>
          <div className="flex flex-wrap gap-2">
            {COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={t.categories.colours[c]}
                aria-pressed={c === colour}
                onClick={() => setColour(c)}
                className={cn(
                  "size-9 rounded-full ring-offset-2 ring-offset-[var(--surface)]",
                  c === colour && "ring-2 ring-foreground",
                )}
                style={{ background: colourVar(c) }}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t.categories.icon}</legend>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                aria-label={key.replaceAll("-", " ")}
                aria-pressed={key === icon}
                onClick={() => setIcon(key)}
                className={cn(
                  "grid aspect-square place-items-center rounded-xl border transition-colors",
                  key === icon
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:bg-surface-2",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Sheet>
  );
}
