// Keyboard helpers: the platform's modifier key and a check that a shortcut does not steal typing.

const isMac = () =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

/** "Ctrl K" on Windows and Linux, "⌘K" on a Mac. */
export const paletteKeys = () => (isMac() ? "⌘K" : "Ctrl K");

/** A device with a real keyboard and pointer (not a phone), where keyboard hints make sense. */
export const hasKeyboard = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** True when the key press belongs to a field the user is typing in (then single-key shortcuts stay quiet). */
export function isTyping(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    Boolean(target.closest("[role='dialog']"))
  );
}

/** Asks the shell to open the command palette (the shell owns it and listens for this event). */
export const openPalette = () => window.dispatchEvent(new Event("ft:palette"));
