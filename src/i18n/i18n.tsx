import { createContext, Fragment, useContext, useMemo, useState, type ReactNode } from "react";
import { MESSAGES, type Locale, type Messages, type Plural } from "./messages.ts";

/** "{name} has {n}" + { name: "Ala", n: 2 } → "Ala has 2" */
export function fill(text: string, values: Record<string, string | number> = {}) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Like fill, but the values may be elements (an <Amount>), placed where the language puts them. */
export function fillNode(text: string, values: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((part, index) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={index}>{key && key in values ? values[key] : part}</Fragment>;
  });
}

const pluralRules = { pl: new Intl.PluralRules("pl-PL"), en: new Intl.PluralRules("en-GB") };

/** Polish has one, few and many: 1 transakcja, 2 transakcje, 5 transakcji. */
export function plural(locale: Locale, forms: Plural, n: number) {
  const form = pluralRules[locale].select(n) as keyof Plural;
  return fill(forms[form] ?? forms.other, { n });
}

interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  fill: typeof fill;
  plural: (forms: Plural, n: number) => string;
}

const Context = createContext<I18n | null>(null);

export function I18nProvider({ initial, children }: { initial: Locale; children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initial);
  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: MESSAGES[locale],
      fill,
      plural: (forms, n) => plural(locale, forms, n),
    }),
    [locale],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error("useI18n needs <I18nProvider>");
  return value;
}

/** The browser's language when it is Polish or English; Polish otherwise (the app is Polish first). */
export const browserLocale = (): Locale =>
  typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en")
    ? "en"
    : "pl";
