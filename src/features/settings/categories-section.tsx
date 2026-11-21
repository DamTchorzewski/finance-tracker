import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardHeader } from "@/components/ui/card.tsx";
import { useCategories, useCategoryMutations } from "@/data/queries.ts";
import type { Category } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { cn } from "@/lib/cn.ts";
import CategorySheet from "../categories/category-sheet.tsx";
import { CategoryBadge } from "../shared.tsx";

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
