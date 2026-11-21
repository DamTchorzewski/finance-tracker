import { ArrowDown, ArrowUp, LogOut } from "lucide-react";

import { useSession } from "@/auth/session.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardHeader } from "@/components/ui/card.tsx";
import { Field, Input, Segmented, Select, Switch } from "@/components/ui/field.tsx";
import { useUpdateProfile } from "@/data/queries.ts";
import type { WidgetKey } from "@/data/types.ts";
import { useI18n } from "@/i18n/i18n.tsx";
import { COMMON_CURRENCIES } from "../accounts/accounts-page.tsx";
import { PageHeader, useBase } from "../shared.tsx";
import { CategoriesSection } from "./categories-section.tsx";
import { DataSection } from "./data-section.tsx";

const ALL_WIDGETS: WidgetKey[] = [
  "balance",
  "cashflow",
  "spending",
  "budgets",
  "goals",
  "recent",
  "rates",
];
const HUES = [160, 200, 250, 290, 330, 20, 60, 120];

export default function SettingsPage() {
  const { t, fill } = useI18n();
  const { profile } = useBase();
  const update = useUpdateProfile();
  const { signOut, session } = useSession();
  const save = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch);

  const widgets = profile.widgets;
  const move = (index: number, by: -1 | 1) => {
    const next = [...widgets];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + by, 0, item);
    save({ widgets: next });
  };

  return (
    <>
      <PageHeader title={t.settings.title} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card aria-labelledby="s-profile">
            <CardHeader id="s-profile" title={t.settings.profile} />
            <div className="flex flex-col gap-4">
              <Field label={t.settings.displayName}>
                {(props) => (
                  <Input
                    {...props}
                    key={profile.displayName ?? ""}
                    maxLength={60}
                    autoComplete="given-name"
                    defaultValue={profile.displayName ?? ""}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value !== (profile.displayName ?? ""))
                        save({ displayName: value || null });
                    }}
                  />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.settings.baseCurrency}>
                  {(props) => (
                    <Select
                      {...props}
                      value={profile.baseCurrency}
                      onChange={(event) => save({ baseCurrency: event.target.value })}
                    >
                      {COMMON_CURRENCIES.map((code) => (
                        <option key={code}>{code}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label={t.settings.language}>
                  {(props) => (
                    <Select
                      {...props}
                      value={profile.locale}
                      onChange={(event) => save({ locale: event.target.value as "pl" | "en" })}
                    >
                      <option value="pl">Polski</option>
                      <option value="en">English</option>
                    </Select>
                  )}
                </Field>
              </div>
              <Field
                label={t.settings.monthStart}
                hint={fill(t.settings.monthStartHint, { day: profile.monthStartDay })}
              >
                {(props) => (
                  <Select
                    {...props}
                    value={profile.monthStartDay}
                    onChange={(event) => save({ monthStartDay: Number(event.target.value) })}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}.
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </Card>

          <Card aria-labelledby="s-look">
            <CardHeader id="s-look" title={t.settings.appearance} />
            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-2 text-sm font-semibold">{t.settings.theme}</p>
                <Segmented
                  label={t.settings.theme}
                  value={profile.theme}
                  onChange={(theme) => save({ theme })}
                  options={(["system", "light", "dark"] as const).map((value) => ({
                    value,
                    label: t.settings.themes[value],
                  }))}
                />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{t.settings.accent}</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {HUES.map((hue) => (
                    <button
                      key={hue}
                      type="button"
                      aria-label={`${t.settings.accent} ${hue}°`}
                      aria-pressed={profile.accentHue === hue}
                      onClick={() => save({ accentHue: hue })}
                      className="size-9 rounded-full ring-offset-2 ring-offset-[var(--surface)] aria-pressed:ring-2 aria-pressed:ring-foreground"
                      style={{ background: `oklch(0.55 0.13 ${hue})` }}
                    />
                  ))}
                </div>
                <input
                  type="range"
                  min={0}
                  max={359}
                  key={profile.accentHue}
                  defaultValue={profile.accentHue}
                  aria-label={t.settings.accent}
                  onChange={(event) =>
                    document.documentElement.style.setProperty("--accent-h", event.target.value)
                  }
                  onPointerUp={(event) => save({ accentHue: Number(event.currentTarget.value) })}
                  onKeyUp={(event) => save({ accentHue: Number(event.currentTarget.value) })}
                  className="mt-3 w-full accent-[var(--accent)]"
                />
              </fieldset>
              <Switch
                checked={profile.privacyMode}
                onChange={(privacyMode) => save({ privacyMode })}
                label={t.settings.privacy}
                hint={t.settings.privacyHint}
              />
            </div>
          </Card>

          <Card aria-labelledby="s-widgets">
            <CardHeader id="s-widgets" title={t.settings.widgets} />
            <ul className="flex flex-col gap-1">
              {[...widgets, ...ALL_WIDGETS.filter((w) => !widgets.includes(w))].map((widget) => {
                const index = widgets.indexOf(widget);
                const shown = index >= 0;
                return (
                  <li key={widget} className="flex items-center gap-2 rounded-2xl px-1 py-1">
                    <input
                      id={`w-${widget}`}
                      type="checkbox"
                      checked={shown}
                      onChange={() =>
                        save({
                          widgets: shown
                            ? widgets.filter((w) => w !== widget)
                            : [...widgets, widget],
                        })
                      }
                      className="size-5 accent-[var(--accent)]"
                    />
                    <label htmlFor={`w-${widget}`} className="flex-1 text-sm font-semibold">
                      {t.settings.widgetNames[widget]}
                    </label>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${t.settings.moveUp}: ${t.settings.widgetNames[widget]}`}
                      disabled={!shown || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${t.settings.moveDown}: ${t.settings.widgetNames[widget]}`}
                      disabled={!shown || index === widgets.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <CategoriesSection />
          <DataSection />
          <Button variant="outline" className="text-negative" onClick={() => void signOut()}>
            <LogOut aria-hidden="true" />
            {session.status === "demo" ? `${t.auth.signOut} (${t.demo.badge})` : t.auth.signOut}
          </Button>
        </div>
      </div>
    </>
  );
}
