import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardHeader } from "@/components/ui/card.tsx";
import { Field, Input, Segmented } from "@/components/ui/field.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import { useCategories, useCategoryMutations } from "@/data/queries.ts";
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

function CategorySheet({
  category,
  open,
  onOpenChange,
}: {
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { create, update } = useCategoryMutations();
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<Category["kind"]>(category?.kind ?? "expense");
  const [icon, setIcon] = useState(category?.icon ?? "shopping-bag");
  const [colour, setColour] = useState<CategoryColour>(category?.colour ?? "teal");
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError(t.required);
    try {
      if (category)
        await update.mutateAsync({ id: category.id, patch: { name: name.trim(), icon, colour } });
      else await create.mutateAsync({ name: name.trim(), kind, icon, colour });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof DataError ? err.message : t.somethingWrong);
    }
  }

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
          <Button type="submit" form="category-form" className="flex-[2]">
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
                aria-label={c}
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
                aria-label={key}
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

export function CategoriesSection() {
  const { t } = useI18n();
  const categories = useCategories().data ?? [];
  const { update } = useCategoryMutations();
  const [sheet, setSheet] = useState<{ open: boolean; category?: Category; key: number }>({
    open: false,
    key: 0,
  });
  const open = (category?: Category) =>
    setSheet((old) => ({ open: true, category, key: old.key + 1 }));

  return (
    <Card aria-labelledby="s-categories">
      <CardHeader
        id="s-categories"
        title={t.categories.title}
        action={
          <Button size="sm" variant="secondary" onClick={() => open()}>
            <Plus aria-hidden="true" />
            {t.categories.new}
          </Button>
        }
      />
      {(["expense", "income"] as const).map((kind) => (
        <div key={kind} className="mb-4 last:mb-0">
          <h3 className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">
            {kind === "expense" ? t.categories.expense : t.categories.income}
          </h3>
          <ul className="-mx-2">
            {categories
              .filter((c) => c.kind === kind)
              .map((category) => (
                <li
                  key={category.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-2 py-1.5",
                    category.archived && "opacity-60",
                  )}
                >
                  <CategoryBadge category={category} size="sm" />
                  <button
                    type="button"
                    onClick={() => open(category)}
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:underline"
                  >
                    {category.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${category.archived ? t.accounts.unarchive : t.accounts.archive}: ${category.name}`}
                    onClick={() =>
                      update.mutate({ id: category.id, patch: { archived: !category.archived } })
                    }
                  >
                    {category.archived ? (
                      <ArchiveRestore aria-hidden="true" />
                    ) : (
                      <Archive aria-hidden="true" />
                    )}
                  </Button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {sheet.key > 0 && (
        <CategorySheet
          key={sheet.key}
          category={sheet.category}
          open={sheet.open}
          onOpenChange={(next) => setSheet((old) => ({ ...old, open: next }))}
        />
      )}
    </Card>
  );
}
