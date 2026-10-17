# DESIGN_SYSTEM.md, nabd (نبض)

The source of truth for the native visual system. Components use semantic tokens only. The native
theme is defined by the hand-written files `apps/native/theme/palette.ts` and
`apps/native/theme/tailwind-theme.cjs`.

## Product character

nabd is Arabic-first and RTL. The visual language is calm, clear, and restrained. The native app
supports light, dark, and system theme preference. That preference is stored in SQLite under
`app_preferences` and restored when the app opens. The former web `classic` and `modern` display
modes are not native settings; settings parity is tracked by NBD-100.

## Semantic color tokens

Use the semantic names exposed by the native theme:

| Role                         | Light intent                  | Dark intent                   |
| ---------------------------- | ----------------------------- | ----------------------------- |
| `background`                 | pale teal ground              | deep teal ground              |
| `surface` and `card`         | white surface                 | deep teal surface             |
| `surface-2` and `muted`      | inset pale teal               | inset dark teal               |
| `foreground`                 | dark teal ink                 | pale teal ink                 |
| `primary`                    | deep teal action              | lighter teal action           |
| `primary-deep`               | deep teal emphasis            | deep teal emphasis            |
| `accent`                     | clear teal highlight          | bright teal highlight         |
| `gold` and `destructive`     | muted gold                    | warm gold                     |
| `gold-soft`                  | soft gold surface             | dark gold surface             |
| `faint`                      | disabled and upcoming content | disabled and upcoming content |
| `border`, `line`, and `ring` | low-contrast teal lines       | low-contrast light lines      |

The palette remains teal-green and gold. There is no red destructive hue. Errors and destructive
surfaces use the semantic gold token, with copy and accessible state carrying the meaning.
Contrast must meet WCAG AA for body text and interactive controls. Disabled or decorative content
may use the faint token only when it is not the sole carrier of meaning.

## Typography

Fonts are bundled and registered through Expo in `apps/native/app.json`:

| Role      | Font       | Use                            |
| --------- | ---------- | ------------------------------ |
| Body      | Tajawal    | interface and explanatory text |
| Display   | Aref Ruqaa | headings and large numerals    |
| Scripture | Amiri      | Quran and hadith text          |

Do not fetch fonts at runtime. Use the named NativeWind font tokens and keep Arabic line height
generous enough for shaping and diacritics.

## Spacing, radius, and elevation

- Spacing follows the shared four-point grid.
- Buttons, cards, chips, icons, and rings use the named theme radii.
- Cards use `surface` with a border and the semantic card shadow. `surface-2` is for nested wells
  and progress tracks.
- Shadows are soft and tinted toward the primary hue. Avoid hard black shadows in light mode.
- Motion is quiet and short. Check-offs and screen transitions must remain usable with reduced
  motion settings.

## RTL and layout

RTL is the default. Use logical spacing and alignment utilities, not left and right coordinates.
Directional icons must mirror when their meaning changes direction. Do not use physical directional
layout assumptions to position content.

## Component states

Every data-bound surface accounts for loading, empty, error, offline, and permission-denied states.
Async controls show an in-flight state and prevent double submission. Permission failures explain
the next action, including a system-settings path when the permission is permanently denied.

## Accessibility and iconography

Use native semantic controls and accessible names. Icon-only controls need a label. Focus, pressed,
selected, disabled, and error states must be visible without color alone.

Functional icons use `lucide-react-native`. Ornament is limited to the existing khatam and gold
accent language, remains secondary to the content, and is hidden from assistive technology when it
does not convey information. Do not use emoji as interface icons.

## Signature surface

The dhikr counter is the signature surface: a calm, oversized tap target with a large Arabic-Indic
numeral. Completion flows into the linked wird checklist through the same append-only completion
event. The exact component treatment follows these tokens and the shared domain contract.
