# DESIGN_SYSTEM.md — nabd (نبض)

The local source of truth for nabd's visual tokens, imported from the nabd Claude Design
system (ADR-0007, ticket NBD-3). Components consume **semantic tokens only** — never a raw
hex, font, or size literal. New need → new token, never a magic value.

> **Source & import.** Concrete values live in the Claude Design project
> (`https://claude.ai/design/p/e42ff72c-8bbf-45a9-9481-a8f8acbbd452`) and were imported as
> the CSS variables in `app/globals.css`. The raw handoff sits under `design-import/`
> (gitignored). If a value must change, change it in the design project and re-import — do
> not hand-edit tokens to diverge from the source.

## One identity, two characters

nabd keeps **one** colour family and **one** font family always. Only three things switch:

- **`data-mode="classic|modern"`** on `<html>` — the _character_: display font + corner radii.
  - **Classic (كلاسيكيّ)** — warm, ornamented; display font **Aref Ruqaa**; round/soft corners
    (icon = full circle).
  - **Modern (حديث)** — clean, geometric; display font **Reem Kufi**; gently squared corners.
- **`data-theme="light|dark"`** on `<html>` — the _lighting_: colours (same identity, a
  dedicated dark palette — not inverted light).
- Nav position (mobile bottom / web top) — a layout concern, not a token.

Everything is **RTL** (`dir="rtl"`, Arabic-only) and every number is **Arabic-Indic**
(٠١٢٣٤٥٦٧٨٩). Default at the root: `data-mode="classic" data-theme="light"`. A mode/theme
switcher UI is a later ticket; NBD-3 only lands the tokens and the defaults.

## Colour

**Palette law (fixed):** teal-green + gold, nothing outside it.

- `--primary` / `--accent` → completed & current acts of worship.
- `--gold` → gentle alerts and makeup (qaḍāʾ) **only**.
- `--faint` → upcoming / disabled.
- There is **no red / destructive** hue. Error and destructive surfaces use `gold` (mapped to
  the shadcn `destructive` slot so components keep working).

Tokens are CSS variables in `app/globals.css`, exposed as Tailwind utilities via `@theme`.
shadcn/ui's semantic names (`background`, `foreground`, `card`, `primary`,
`primary-foreground`, `secondary`, `muted`, `muted-foreground`, `accent`, `accent-foreground`,
`destructive`, `border`, `input`, `ring`) are **bridged** to these values so generated
components render in-palette.

### Light (نهار) — Classic default

| Token                                 | Utility                  | Hex                           |
| ------------------------------------- | ------------------------ | ----------------------------- |
| `--bg` / `background`                 | `bg-background`          | `#EAF2F0` (Modern: `#F4F8F7`) |
| `--surface` / `card`                  | `bg-surface` / `bg-card` | `#FFFFFF`                     |
| `--surface-2` / `muted`, `secondary`  | `bg-surface-2`           | `#EAF2F0`                     |
| `--primary`                           | `bg-primary`             | `#0E5A5A`                     |
| `--primary-deep`                      | `text-primary-deep`      | `#0E4F52`                     |
| `--accent`                            | `bg-accent`              | `#2FA6A0`                     |
| `--gold` / `destructive`              | `text-gold`              | `#C79A3A`                     |
| `--gold-soft`                         | `bg-gold-soft`           | `#FBF3DF`                     |
| `foreground` (ink)                    | `text-foreground`        | `#0E3234`                     |
| `--muted-foreground`                  | `text-muted-foreground`  | `#4A706D` (Modern: `#4D7875`) |
| `--faint`                             | `text-faint`             | `#9BBEBB`                     |
| `--on-primary` / `primary-foreground` | `text-on-primary`        | `#EAF2F0`                     |
| `accent-foreground`                   | `text-accent-foreground` | `#0E3234`                     |
| `--line` / `border`                   | `border-border`          | `rgba(16,48,47,.10)`          |
| `ring`                                | `ring-ring`              | `#2FA6A0`                     |
| `--ring-track`                        | `bg-ring-track`          | `rgba(234,242,240,.22)`       |

### Dark (ليل) — both modes

| Token                    | Hex                     |
| ------------------------ | ----------------------- |
| `--bg` / `background`    | `#08201F`               |
| `--surface` / `card`     | `#0E3234`               |
| `--surface-2` / `muted`  | `#103A38`               |
| `--primary`              | `#12736F`               |
| `--primary-deep`         | `#0E5A5A`               |
| `--accent`               | `#3FBDB6`               |
| `--gold` / `destructive` | `#D9AE4E`               |
| `--gold-soft`            | `#2A2A18`               |
| `foreground` (ink)       | `#EAF2F0`               |
| `--muted-foreground`     | `#7FA6A3`               |
| `--faint`                | `#4E6E6B`               |
| `accent-foreground`      | `#08201F`               |
| `--line` / `border`      | `rgba(234,242,240,.10)` |

### Contrast (WCAG AA: body ≥ 4.5:1, large text / UI ≥ 3:1)

Measured with a WCAG 2.1 luminance calc.

| Pair                                         | Ratio | Bar    |
| -------------------------------------------- | ----- | ------ |
| Light ink on bg                              | 12.11 | AA     |
| Light ink on surface                         | 13.78 | AA     |
| Light on-primary on primary                  | 7.02  | AA     |
| Light accent-foreground (ink) on accent      | 4.65  | AA     |
| Light primary-deep on gold-soft (alert text) | 8.41  | AA     |
| Light muted-foreground on bg (Classic)       | 4.82  | AA     |
| Light muted-foreground on bg (Modern)        | 4.61  | AA     |
| Light faint on bg (disabled — decorative)    | 1.76  | exempt |
| Dark ink on bg                               | 14.92 | AA     |
| Dark ink on surface                          | 12.11 | AA     |
| Dark on-primary on primary                   | 4.98  | AA     |
| Dark muted-foreground on bg                  | 6.38  | AA     |
| Dark gold on surface                         | 6.63  | AA     |
| Dark faint on bg (disabled)                  | 3.05  | UI ✓   |

## Typography

Multiple faces, one per context. Fonts load via `next/font/google` in `app/layout.tsx`
(Tajawal, Amiri, Aref Ruqaa, Reem Kufi) and inject CSS variables.

| Utility                   | CSS var            | Face                                              | Usage                        |
| ------------------------- | ------------------ | ------------------------------------------------- | ---------------------------- |
| `font-scripture`          | `--font-scripture` | **Amiri**                                         | āyāt (﴿…﴾) and aḥādīth («…») |
| `font-display`            | `--font-display`   | **Aref Ruqaa** (Classic) / **Reem Kufi** (Modern) | headings, big numerals       |
| `font-body` / `font-sans` | `--font-body`      | **Tajawal**                                       | UI / body text               |

Type scale (px, generous Arabic leading). Tailwind utilities in parentheses:

| Utility          | Size | Line-height |
| ---------------- | ---- | ----------- |
| `text-display`   | 40   | 1.2         |
| `text-title`     | 24   | 1.2         |
| `text-subtitle`  | 22   | 1.3         |
| `text-body`      | 16   | 1.7         |
| `text-scripture` | 16   | 2.0         |
| `text-small`     | 13   | 1.5         |
| `text-xsmall`    | 12   | 1.5         |
| `text-label`     | 11   | 1.4         |

Weights: `--fw-regular 400`, `--fw-medium 500`, `--fw-semibold 600`, `--fw-bold 700`,
`--fw-black 900`.

## Spacing, radii, elevation

- **Spacing** — 4px grid (`--sp-1 … --sp-12`), parity with Tailwind's default scale.
- **Radii** — mode-bound, exposed as `--radius` (drives shadcn `sm/md/lg`) plus role radii
  `rounded-icon / rounded-btn / rounded-chip / rounded-card / rounded-ring`. Classic:
  icon 50%, btn 14, chip 22, card 16, ring 50%. Modern: icon 12, btn 12, chip 10, card 16,
  ring 22.
- **Elevation** — two soft, tinted levels: `shadow-card-sm`, `shadow-card`. Light is tinted
  toward the primary hue; dark is deeper. No hard black shadows in light.
- **Card law (NBD-34).** In light, `--surface-2` equals `--bg`, so a card painted
  `bg-surface-2` on the page background is invisible. Anything that should read as a card on
  the page uses `bg-surface` + `border-border` + `shadow-card-sm` (`shadow-card` for hero
  surfaces). `surface-2` is reserved for **nested wells** — progress tracks, inset list rows
  inside an already-white card.
- **Motion** — quiet: `--ease` `cubic-bezier(.22,.61,.36,1)`, `--dur` `.22s`. No bounce.
  Check-offs may `animate-in zoom-in`; screens may `fade-in` — always ≤ 500ms, tw-animate-css
  utilities only.

## Ornament

Deep-teal feature surfaces (hero ring card, adhkar active card, streak card, celebration)
use the **`.pattern-khatam`** utility (`app/globals.css`): a khatam / eight-point-star
lattice — the ۞ of the glyph set — drawn in `--on-primary` at whisper opacity over a quiet
`--primary → --primary-deep` gradient. Pair it with `text-on-primary`; never place it under
long body text. The ۞ and ✦ glyphs may also appear inline as gold accents (`text-gold`) —
decoration only, always `aria-hidden`.

## Dark mode

Light + dark from day one, switched by **`data-theme` on `<html>`** (nabd uses the
`data-theme`/`data-mode` attribute model, not a `.dark` class). shadcn's `dark:` variant is
retargeted to `[data-theme="dark"]`. Dark is a dedicated palette (tinted-not-pure-black
background), not inverted light. Components reference semantic tokens, so both modes are free.

## RTL rules

Default direction is **RTL** (Arabic-only). RTL-first is a hard rule:

- CSS **logical properties** everywhere: `ps- pe- ms- me- start- end- text-start text-end
rounded-s- rounded-e-`.
- **Banned:** physical directional classes — `pl- pr- left- right- text-left text-right
rounded-l- rounded-r-`. Lint should flag these.
- Directional icons (chevrons, arrows) get `rtl:rotate-180`.

## UX states

- Every data-bound view has a **skeleton** (Dexie `useLiveQuery` returns `undefined`
  in-flight — render the skeleton, never coerce to null).
- Every route segment that can fail has an **error surface** (`error.tsx`).
- Async buttons show an **in-flight** state and **block double submits** (an `inFlight` ref
  guard, `docs/stack.md` §3).

## Accessibility (WCAG AA, hard requirement)

- Semantic HTML (real `button`, `nav`, `main`, ordered headings) — not `div` soup.
- Fully keyboard reachable; visible focus ring on every interactive element (the `ring`
  token).
- Colour contrast meets AA (see the table; sub-AA pairs are tracked, not shipped as final).
- Icon-only controls (e.g. the counter tap button) have accessible names.

## Iconography

**Functional icons are `lucide-react`** (the shipped reality since NBD-22/29/31: nav, check
marks, chevrons, flame, bell…), rendered in the current text colour, usually inside a
`rounded-icon` medallion (`bg-primary/10 text-primary`, or `bg-on-primary/10` on deep-teal).
The curated **unicode glyphs** remain the ornament voice — `✦` highlight · `۞`
qaḍāʾ/ornament · `☾` night — used decoratively (`aria-hidden`, `text-gold`/`text-faint`).
**No emoji.** There is no logo yet; the name «نبض» is set in the display font wherever a
mark would go.

## Signature

The dhikr **counter / misbaḥa** is nabd's signature surface: an oversized, calm tap target
with a large live Arabic-Indic numeral in the display font, where completing the count visibly
flows into the wird checklist (counter and checklist are one connected motion). The exact
treatment is realized in the counter ticket (NBD-9) against these tokens.

---

**Contrast fix (NBD-18):** light-theme `muted-foreground` was corrected to meet body AA —
Classic `#5c8582` → `#4a706d` (3.60 → 4.82 on `bg`, 5.48 on `surface`) and Modern
`#7ba09d` → `#4d7875` (2.67 → 4.61 on `bg`). Same teal hue family; Modern stays lighter
than Classic. These values are the source of truth; if the Claude Design project is
re-imported later, keep or re-apply this correction.
