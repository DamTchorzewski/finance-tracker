import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Field, Input, Segmented } from "@/components/ui/field.tsx";
import { FormFooter } from "@/components/ui/form-footer.tsx";
import { ColourPicker, IconPicker } from "@/components/ui/look-picker.tsx";
import { Sheet } from "@/components/ui/sheet.tsx";
import { useCategoryMutations } from "@/data/queries.ts";
import { DataError, type Category, type CategoryColour } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { CATEGORY_ICONS } from "@/lib/icons.ts";
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
      footer={<FormFooter form="category-form" busy={busy} onCancel={() => onOpenChange(false)} />}
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
        <ColourPicker colours={COLOURS} value={colour} onChange={setColour} />
        <IconPicker
          icons={Object.keys(CATEGORY_ICONS)}
          value={icon}
          onChange={setIcon}
          className="sm:grid-cols-8"
        />
      </form>
    </Sheet>
  );
}
