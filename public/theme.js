// Sets the theme, the accent hue and the privacy mode before the first paint, from what the app saved last time
// (src/app/prefs.ts). An external file, so the Content-Security-Policy needs no inline script.
(function () {
  var root = document.documentElement;
  var prefs = null;
  try {
    prefs = JSON.parse(localStorage.getItem("ft-prefs") || "null");
  } catch (e) {}
  var theme = (prefs && prefs.theme) || "system";
  if (theme === "system")
    theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.dataset.theme = theme;
  if (prefs && typeof prefs.accentHue === "number") {
    root.style.setProperty("--accent-h", String(prefs.accentHue));
    // the brand hue keeps its own chroma, as in src/app/prefs.ts
    root.style.setProperty("--accent-c", prefs.accentHue === 328 ? "0.17" : "0.12");
  }
  root.dataset.privacy = prefs && prefs.privacyMode ? "on" : "off";
  if (prefs && prefs.locale) root.lang = prefs.locale;
})();
