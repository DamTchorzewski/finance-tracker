# Brand: Piggo

The name, logo, colours, type, illustrations and motion of the app, the files generated from them and where each one is
used. The design direction it serves is in [redesign-plan.md](redesign-plan.md#design-direction); decisions with dates
are in [decisions.md](decisions.md). Written 2026-11-21.

## Name

**Piggo**: a piggy bank ("skarbonka") that goes somewhere. Short, said the same way in Polish and English ("pigo"),
and it says what the app is for: putting money aside and watching it grow.

- Chosen by the owner on 2026-11-21 from two shortlists (Polish names, then English ones; "Fern" was dropped for
  having no obvious meaning).
- Quick check on 2026-11-21: no finance app called Piggo was found. The literal names around it are crowded (dozens of
  "Piggy" and "Piggy Bank" apps; CoinJar is a crypto exchange; Moneybox a UK savings app), which is why the name has
  the extra "-go". This was a web search, **not a trademark search** (UPRP, EUIPO): do that before any public launch.
- In the app the name is the constant `appName` in `src/i18n/messages.ts`, the same in both languages.
- The repository keeps its descriptive name `finance-tracker` (`standards/repo-names.md`).

## Logo

The mark is a piggy bank seen from the side whose body is a perfect circle, a coin, with a coin slot on its back. The
wordmark "piggo" is drawn with the same rounded stroke; the dot of the **i** is a coin. The wordmark is a drawing,
not a font: always use the SVG, never type "piggo" in a typeface.

| Variant          | File                                           | Use                                                 |
| ---------------- | ---------------------------------------------- | --------------------------------------------------- |
| Lockup, light    | `assets/brand/piggo-logo.svg`                  | the sign-in screen and README on a light background |
| Lockup, dark     | `assets/brand/piggo-logo-dark.svg`             | the same on a dark background                       |
| Mark             | `assets/brand/piggo-mark.svg`                  | the side rail, the top bar, anywhere from 40 px up  |
| Mark, dark       | `assets/brand/piggo-mark-dark.svg`             | the same on a dark background                       |
| Mark, small      | `assets/brand/piggo-mark-small.svg`            | 16 to 39 px: no eye and no tail, a wider slot       |
| Mark, one colour | `assets/brand/piggo-mark-mono.svg`             | `fill="currentColor"`: inline it and set `color`    |
| Wordmark         | `assets/brand/piggo-wordmark.svg`, `-dark.svg` | next to a mark that is placed separately            |
| App icon master  | `assets/brand/piggo-app-icon.svg`              | the source of the PNG icons below                   |

Rules:

- **Clear space** around the mark and the lockup: at least half the height of the mark's ear (1/8 of the mark height).
- **Minimum size**: full mark 40 px high, small mark 16 px, lockup 24 px high.
- **Colours**: the mark is the accent (`berry600` on light, `berry300` on dark) or `cream` on a `berry600` tile; the
  wordmark is `ink` or `snow` with the accent dot. Nothing else: no gradients, shadows, outlines, stretching, rotating,
  or a mark on a busy photo.
- The pig always faces right (towards the content and the future).

## Colour

One brand hue, **berry**, OKLCH hue **328**: a deep plum-magenta that no big Polish bank or finance app uses (they are
blue, green, red or violet around 300), with a warm **coin gold** as the only second colour. The app's accent is one hue
the user can change (`--accent-h`); 328 is the default, so the logo and the illustrations follow the user's choice.

### Primitive tokens

| Token       | OKLCH                    | Hex       | Role                                                    |
| ----------- | ------------------------ | --------- | ------------------------------------------------------- |
| `berry600`  | `oklch(0.5 0.17 328)`    | `#943593` | accent, light theme; the mark; the app-icon tile        |
| `berry300`  | `oklch(0.78 0.12 328)`   | `#e19bde` | accent, dark theme                                      |
| `berry100`  | `oklch(0.94 0.04 328)`   | `#fbe2f9` | accent-soft, light theme; the disc behind illustrations |
| `berry900`  | `oklch(0.3 0.07 328)`    | `#40203f` | accent-soft, dark theme                                 |
| `ink`       | `oklch(0.21 0.02 328)`   | `#1d151d` | text and wordmark, light theme                          |
| `paper`     | `oklch(0.975 0.006 328)` | `#f9f5f9` | page, light theme; PWA `background_color`               |
| `night`     | `oklch(0.16 0.012 328)`  | `#100b10` | page, dark theme                                        |
| `snow`      | `oklch(0.96 0.008 328)`  | `#f5f0f4` | text and wordmark, dark theme                           |
| `cream`     | `oklch(0.985 0.012 328)` | `#fff7fe` | the pig on a berry tile                                 |
| `coin`      | `oklch(0.82 0.14 82)`    | `#f1ba4b` | coins in the icon, illustrations and motion             |
| `coin-deep` | `oklch(0.6 0.12 70)`     | `#ad721c` | coin rim and shade                                      |

### In the app

The token layers stay as they are (primitive OKLCH → semantic `--color-*` → components); the defaults change and the
accent gets its own chroma, because the brand berry is more saturated than the other hues can be:

```css
:root {
  --accent-h: 328; /* was 160 */
  --accent-c: 0.17; /* 0.12 for every other hue */
  --accent: oklch(0.5 var(--accent-c) var(--accent-h));
  --coin: oklch(0.82 0.14 82);
  --coin-deep: oklch(0.6 0.12 70);
}
:root[data-theme="dark"] {
  --accent: oklch(0.78 0.12 var(--accent-h));
  --accent-soft: oklch(0.3 0.07 var(--accent-h));
}
```

- `src/app/prefs.ts` sets `--accent-c` to `0.17` when the hue is 328 and `0.12` otherwise. At chroma 0.17 several other
  hues leave the sRGB gamut and drop below 4.5:1 (hue 200: 4.36:1 on `--surface-2`), so the extra chroma is for the
  brand hue only.
- The accent choices in `src/features/settings/settings-page.tsx` (`HUES`) start with 328 and drop 330 (too close).
- The default profile `accentHue` (160 today in `src/data/demo-source.ts` and in the API's profile defaults) becomes 328.
- The neutrals already take a tint from `--accent-h`, so `paper`, `night`, `ink` and `snow` above are what the current
  `--bg`, `--fg` formulas give at hue 328.

### Contrast (WCAG 2.2, computed from the OKLCH values at hue 328)

| Pair                               | Light   | Dark    |
| ---------------------------------- | ------- | ------- |
| accent on `--bg`                   | 6.12:1  | 9.23:1  |
| accent on `--surface`              | 6.59:1  | 8.54:1  |
| accent on `--surface-2`            | 5.76:1  | 7.64:1  |
| accent on `--accent-soft`          | 5.45:1  | 6.67:1  |
| `--accent-fg` on accent (buttons)  | 6.38:1  | 8.99:1  |
| `--fg` on `--bg`                   | 16.54:1 | 17.27:1 |
| `--muted` on `--bg` / `--surface`  | 6.40:1  | 7.75:1  |
| `cream` pig on the `berry600` tile | 6.29:1  | -       |

Every text pair is above 4.5:1 and every icon pair above 3:1 in both themes. **Coin gold is never text and never the
only carrier of meaning**: on `paper` it is 1.64:1, so it is used only for decoration next to shapes that have their
own contrast (the coin rim, the pig).

### Money colours and categories

- Income and expense keep their own tokens (`--positive` hue 155, `--negative` hue 25). Berry is 57° away from the
  expense red but has the same lightness, so amounts are never told apart by colour: the sign and the word are always
  there (`Amount` already does this).
- Categories keep the colour-blind safe palette of `src/styles/app.css` (`--cat-*`, twelve colours apart in hue and
  lightness). Its `plum` (hue 330) is close to the accent; it is fine as a category colour because categories always
  show their name and icon, but do not make plum the default for a new category.

## Typography

- **Manrope Variable** (SIL Open Font License), self-hosted through `@fontsource-variable/manrope`: Vite bundles its
  WOFF2 files with hashed names, no CDN. Latin and Latin Extended subsets, so every Polish letter is in the font.
  Weights 200-800 in one file.
- **Figures**: amounts use tabular figures (`font-variant-numeric: tabular-nums`, the `.tabular` utility), so columns
  line up and counters do not jump. The big balance uses weight 700 to 800 and tight tracking (`-0.02em`).
- Fallback stack: `ui-sans-serif, system-ui, sans-serif`; `font-display: swap` from Fontsource.
- The wordmark is a drawing and never uses Manrope.

## Illustrations

Flat and geometric, built from the logo's pieces: the pig (with a mood: dot, happy, sleepy, surprised), gold coins,
cards and paper, on a soft accent disc with a ground shadow. No outlines except thin `line` strokes, no gradients, no
text inside the pictures.

| File (`src/assets/illustrations/`)   | Size      | Where                                                   |
| ------------------------------------ | --------- | ------------------------------------------------------- |
| `signin-hero.svg`                    | 480 × 360 | the sign-in and sign-up screens (inline, themed)        |
| `signin-hero-light.svg`, `-dark.svg` | 480 × 360 | the same with fixed colours, for `<img>` or `<picture>` |
| `empty-transactions.svg`             | 240 × 180 | transactions list with no entries                       |
| `empty-budgets.svg`                  | 240 × 180 | budgets page with no budgets                            |
| `empty-goals.svg`                    | 240 × 180 | goals page with no goals                                |
| `nothing-found.svg`                  | 240 × 180 | a search or filter with no results                      |
| `offline.svg`                        | 240 × 180 | no connection (the cached data is shown under it)       |
| `error.svg`                          | 240 × 180 | an error boundary or a failed request                   |
| `not-found.svg`                      | 240 × 180 | the 404 route                                           |
| `all-caught-up.svg`                  | 240 × 180 | no alerts, every budget fine, nothing to review         |
| `onboarding-accounts.svg`            | 320 × 240 | onboarding step 1: add your accounts                    |
| `onboarding-budgets.svg`             | 320 × 240 | onboarding step 2: set monthly budgets                  |
| `onboarding-goals.svg`               | 320 × 240 | onboarding step 3: save for a goal                      |

- All SVG, 2 to 4 kB each, no ids and no masks, so several can be inlined on one page.
- Colours are the variables `--ill-accent`, `--ill-accent-soft`, `--ill-surface`, `--ill-surface-2`, `--ill-paper`,
  `--ill-line`, `--ill-ink`, `--ill-muted`, `--ill-pig-light`, `--ill-coin`, `--ill-coin-deep`, each with the light
  value as fallback. Inline them with the `Illustration` component, which maps the variables to the app tokens:

  ```tsx
  import offline from "@/assets/illustrations/offline.svg?raw";
  import { Illustration } from "@/components/brand/illustration.tsx";

  <Illustration svg={offline} className="mx-auto w-60" />;
  ```

- They are decorative (`aria-hidden`): the heading and the text next to them say what happened and what to do.
- The hero is the largest picture on the sign-in screen; inline it (no request) or use the fixed copy with
  `fetchpriority="high"`, never lazy.

## Motion

| Asset                             | File                                  | Size         | Use                                                                      |
| --------------------------------- | ------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| Goal jar (fill level is an input) | `src/components/brand/goal-jar.tsx`   | ~5 kB source | every savings goal: `<GoalJar level={0.55} label="Wakacje: 55% celu" />` |
| Success check                     | `src/assets/motion/success-check.svg` | 1.1 kB       | after saving a transaction, an import, a budget                          |
| Goal-reached burst                | `src/assets/motion/goal-burst.svg`    | 3.6 kB       | over the jar or the goal card when a goal hits 100 %                     |

- **Goal jar**: an SVG component with CSS motion, no library. Gold coins fill the jar to `level` (0 to 1) with a 700 ms
  ease-out; each time the level goes up a coin drops through the lid (900 ms); at 1 the lid pops and three sparkles
  flash. Colours: `--accent` (lid, sparkles), `--accent-soft` (glass), `--border` (outline), `--coin`/`--coin-deep`.
  `label` is the accessible name (`role="img"`). With `prefers-reduced-motion: reduce` the level changes at once and
  nothing drops or pops.
- **Success check** and **goal-reached burst** are SVG files that animate by themselves (CSS inside the file) and play
  once: the check draws in 560 ms and keeps the last frame; the burst (rays, flying coins and a ring, 1 s) ends empty,
  so it is an overlay. Use them as `<img src={url} alt="">` (or inline); to play again, change the `key` of the
  element. With reduced motion the check appears finished and the burst does not show.
- Nothing loops, nothing flashes more than three times a second, and all three respect reduced motion
  (`standards/accessibility.md`).

### Rive version of the jar (not delivered)

The plan asked for a Rive state machine. Rive files are authored in the Rive editor (a visual tool), which this work
could not use, so the jar ships as the component above. If a Rive file is wanted later, this is the spec:

- Artboard 240 × 300, the jar drawn as in `goal-jar.tsx` (lid, glass, coin pile with a scalloped top, eight coin faces).
- State machine `Jar` with inputs `level` (number 0-100), `addCoin` (trigger) and `reached` (boolean).
- States: `Idle` (the pile follows `level` through a 1D blend of a 0 → 100 timeline), `Drop` (a coin falls from above
  the lid to the pile top in 0.9 s, then back to `Idle`; entered on `addCoin`), `Reached` (lid pop and sparkles, entered
  when `reached` is true, stays on the last frame).
- Colours bound to the brand tokens; the runtime (`@rive-app/react-canvas-lite`) and the `.riv` file loaded on demand on
  the goals page only, the file under 30 kB, and the component above kept as the reduced-motion and no-WebGL fallback.

## PWA and browser icons

| File                                             | Size     | Shape                                                    | Used by                                            |
| ------------------------------------------------ | -------- | -------------------------------------------------------- | -------------------------------------------------- |
| `public/favicon.svg`                             | any      | small pig, no tile; berry600, berry300 in a dark browser | `<link rel="icon" type="image/svg+xml">`           |
| `public/favicon-32.png`                          | 32       | berry tile with the small pig                            | `<link rel="icon" sizes="32x32">` (older browsers) |
| `public/apple-touch-icon.png`                    | 180      | full berry square, cream pig, coin                       | `<link rel="apple-touch-icon">`                    |
| `public/icons/icon-192.png`, `-512.png`          | 192, 512 | rounded berry tile on transparency                       | manifest, `purpose: "any"`                         |
| `public/icons/icon-maskable-192.png`, `-512.png` | 192, 512 | full bleed, pig inside the 80 % safe circle              | manifest, `purpose: "maskable"`                    |

The old placeholder `public/icon.svg` can go once `index.html` and the manifest point at these files. Manifest values:
`name` and `short_name` "Piggo", `theme_color` `#943593`, `background_color` `#f9f5f9`.

## The generator

Every file above (except the two components) is written by one script from one geometry and one palette, kept outside
the app in the `tools` repository (`standards/tools.md`):
`tools/projects/finance-tracker/build-brand-assets.mjs` with its modules in `brand/` (`colors.mjs`, `geometry.mjs`,
`illustrations.mjs`, `motion.mjs`). From this repository's root:

```bash
node ../tools/projects/finance-tracker/build-brand-assets.mjs
```

It uses Chromium from the app's Playwright for the PNG files and writes a local review sheet to
`.scratch/exports/brand/sheet.html`. Change the shapes or colours there, run it, review the diff, commit.

## Rights

The name, the mark, the wordmark, the illustrations and the motion were made for this project and copy nothing from
third-party brands or the glass dashboard sample. Manrope is under the SIL Open Font License.
