import { useEffect } from "react";
import type { Profile } from "@/data/types.ts";

// The look the user chose, applied to <html>: theme, accent hue, privacy mode and language. The same values are kept
// in localStorage so /theme.js can set them before the first paint (no flash of the wrong theme).

const STORAGE_KEY = "ft-prefs";

type Prefs = Pick<Profile, "theme" | "accentHue" | "privacyMode" | "locale">;

/** The brand hue (328) is more saturated than the others can be and keep their contrast (docs/brand.md). */
export const BRAND_HUE = 328;
export const accentChroma = (hue: number) => (hue === BRAND_HUE ? "0.17" : "0.12");

const dark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function applyPrefs(prefs: Prefs) {
  const root = document.documentElement;
  root.dataset.theme = prefs.theme === "system" ? (dark() ? "dark" : "light") : prefs.theme;
  root.style.setProperty("--accent-h", String(prefs.accentHue));
  root.style.setProperty("--accent-c", accentChroma(prefs.accentHue));
  root.dataset.privacy = prefs.privacyMode ? "on" : "off";
  root.lang = prefs.locale;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", root.dataset.theme === "dark" ? "#100b10" : "#f9f5f9");
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // the look still applies for this visit
  }
}

export function storedPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Prefs) : null;
  } catch {
    return null;
  }
}

/** Keeps <html> in step with the profile, and with the system theme while "system" is chosen. */
export function usePrefs(prefs: Prefs | undefined) {
  useEffect(() => {
    if (!prefs) return;
    applyPrefs(prefs);
    if (prefs.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyPrefs(prefs);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [prefs]);
}
