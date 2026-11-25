import { Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/i18n.tsx";
import { Button } from "./button.tsx";

/** The footer of a form in a sheet: delete (when there is something to delete), cancel and submit. */
export function FormFooter({
  form,
  submitLabel,
  busy,
  onCancel,
  onDelete,
}: {
  form: string;
  submitLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <div className="flex gap-2">
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.delete}
          className="text-negative"
          onClick={() => void onDelete()}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      )}
      <Button variant="secondary" className="flex-1" onClick={onCancel}>
        {t.cancel}
      </Button>
      <Button type="submit" form={form} className="flex-[2]" disabled={busy}>
        {submitLabel ?? t.save}
      </Button>
    </div>
  );
}
