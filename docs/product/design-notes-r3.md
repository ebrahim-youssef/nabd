# R3 design notes — owner mockups (2026-07-16)

The owner supplied seven mobile mockups from his Claude Design system (same tokens: teal +
gold, Classic display face, ring progress, pill bottom-nav). This file preserves what each
screen specifies so later tickets build the right thing. Source of truth for visuals stays
`DESIGN_SYSTEM.md`; these are behavioral notes.

## 1. الرئيسية — ورد اليوم (NBD-33 polish)

- Scripture banner up top, then a **deep-teal card** holding the day ring (gold arc, ٪ inside)
  with the next-prayer countdown chip under it.
- Areas listed as rows with count chips (like our accordions). قضاء الفوائت appears as a gold
  row — **future** (see §3).
- Bottom nav: pill-shaped, five slots in the mock; ours keeps three (الرئيسية وسطًا).

## 2. الصلوات والمواقيت

- Large countdown card: "الصلاة القادمة — العصر ٣:٤٨" + "يتبقى ساعة و٥ دقائق".
- List of today's prayers, each row: name, time, check state; current prayer highlighted.
- أذان toggle + قبلة hint at the bottom.
- Our build integrates this into the prayers accordion (sub-header + per-row times). A
  dedicated مواقيت view like the mock is optional/later.

## 3. قضاء الفوائت — FUTURE

- A qada ledger: total missed (e.g. "٢٧ صلاة"), progress bar "قضيت ١٤٣", per-prayer rows with
  +/- steppers to log make-ups.
- Related future rule: checking a prayer **after** its window closed marks it قضاء rather
  than أداء (needs an entry flag — ADR required before build).

## 4. أذكار الصباح (NBD-29 interactive flow)

- Tabs at the top: الصباح / المساء (extendable to بعد الصلاة/النوم).
- **Active dhikr card**: deep-teal, the dhikr text + large Arabic-Indic counter; tapping the
  card increments; ring/count shows progress toward the dhikr's repeat target.
- Below: a horizontal strip of the **next three** dhikr mini-cards (text + ×count). Only
  three visible; the strip itself scrolls (never the page). Completing the active dhikr
  auto-advances: the finished card leaves, the next slides in, the counter resets.
- Finishing ALL adhkar in the tab auto-marks the linked wird item (أذكار الصباح/المساء) on
  the home checklist. The wird item also deep-links to its tab here. Both completion paths
  stay valid (direct check-off on home, or the guided flow).

## 5. نوايا اليوم — FUTURE (user-added daily intentions)

- The mock lets the user pick/add intentions per day ("+ أضف نية جديدة"). For now the
  library stays a fixed curated list (NBD-13/24); the daily-selection layer is later.

## 6. الإحصائيات (NBD-31)

- Streak flame card ("٧ أيام متتالية"), weekly bar chart (gold = complete days), percentage
  cards (إتمام الورد، أفضل سلسلة), قضاء summary tile (future-linked).
- Plus owner request: **export** — the user can export a week or a full month of his data.

## 7. إتمام الورد (NBD-32)

- Full-screen celebratory view when the day hits ١٠٠٪: patterned deep-teal background, gold
  ring, "أتمَمْتَ وِرْدَكَ اليوم" + a hadith line, buttons: سلسلة X يومًا / شارك إنجازك.
- Trigger: ring reaching 100% required completion → show once per day.
