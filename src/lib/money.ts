// Money in the app is an integer of minor units (grosze, cents) with an ISO 4217 code, as in the API.

const digitsCache = new Map<string, number>();

function minorDigits(code: string): number {
  let digits = digitsCache.get(code);
  if (digits === undefined) {
    digits =
      new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    digitsCache.set(code, digits);
  }
  return digits;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, currency: string, compact: boolean, signed: boolean) {
  const key = `${locale}|${currency}|${compact}|${signed}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB", {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : undefined,
      signDisplay: signed ? "exceptZero" : "auto",
    });
    formatters.set(key, format);
  }
  return format;
}

/** 8640 PLN → "86,40 zł" (pl) or "PLN 86.40" (en). */
export function formatMoney(
  minor: number,
  currency: string,
  locale: string,
  options: { compact?: boolean; signed?: boolean } = {},
): string {
  return formatter(locale, currency, options.compact ?? false, options.signed ?? false).format(
    minor / 10 ** minorDigits(currency),
  );
}

const DECIMAL = /^([+-])?(\d*)(?:[.,](\d*))?$/;

/**
 * What a person types into an amount field → minor units, or null when it is not an amount.
 * Accepts "12", "12,5", "12.50", "1 234,56" (spaces are thousands), rounds half up on the digits themselves.
 */
export function parseAmount(text: string, currency: string): number | null {
  const clean = text.replace(/[\s\u00a0]/g, "").replace(/(zł|pln|eur|usd|€|\$)$/i, "");
  const match = DECIMAL.exec(clean);
  if (!match || (!match[2] && !match[3])) return null;
  const digits = minorDigits(currency);
  const [, sign, whole = "", fraction = ""] = match;
  const padded = fraction.padEnd(digits + 1, "0");
  let minor = Number(whole || "0") * 10 ** digits + Number(padded.slice(0, digits) || "0");
  if (Number(padded[digits]) >= 5) minor += 1;
  if (!Number.isSafeInteger(minor)) return null;
  return sign === "-" && minor !== 0 ? -minor : minor;
}

/** Minor units → the text an amount field shows when editing (no currency, locale decimal mark). */
export function amountInput(minor: number, currency: string, locale: string): string {
  const value = (minor / 10 ** minorDigits(currency)).toFixed(minorDigits(currency));
  return locale === "pl" ? value.replace(".", ",") : value;
}

/** Converts minor units through the PLN mid rates (PLN per unit; PLN is 1). */
export function convertMinor(
  minor: number,
  from: { code: string; mid: number },
  to: { code: string; mid: number },
): number {
  if (from.code === to.code) return minor;
  const value = (minor / 10 ** minorDigits(from.code)) * (from.mid / to.mid);
  return Math.round(value * 10 ** minorDigits(to.code));
}
