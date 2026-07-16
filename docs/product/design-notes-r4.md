# Design notes — R4 (owner intake, 2026-07-16, voice note)

Owner-requested round 4, captured verbatim-in-spirit. Each § becomes a backlog ticket;
per-ticket planning happens before its implementation (owner asked for an explicit
plan-first pass on every ticket: files touched, changes, alternatives, best option).

## §1 Theme + mode switcher

- **Theme (light/dark)**: toggle lives **in the header** (home).
- **Mode (classic/modern)**: lives **in the settings page** (§2).
- Both exist as tokens already (`data-theme`, `data-mode` on `<html>`); today they are
  hardcoded to `classic` + `light`.

## §2 Settings page (new)

A new صفحة الإعدادات hosting, at minimum:

- Mode switcher (classic/modern) — §1.
- Prayer-time **calculation method picker** (was backlog "Later").
- Notification sound prefs land here too when §5 ships.

## §3 Dedicated مواقيت الصلاة page (new)

The standalone prayer-times view (design-r3 §2 deferred item): all five times for today,
current/next indicators — beyond the in-checklist sub-header.

## §4 قضاء الفوائت page (new)

- Page shows the five prayers, each with its **remaining qada count**.
- "إضافة فوائت" button opens a **small modal**: inputs for سنين / شهور / أيام the user
  estimates they missed.
- On submit: convert everything to **days** (sum), and add that count **to each of the
  five prayers**.
- Example: 3 missed days → الفجر ٣، الظهر ٣، … Each "تم قضاء صلاة" tap decrements that
  prayer's counter by ١.
- Needs the qada ADR (entry flag) that the backlog already anticipates.

## §5 Push notifications (app closed) + sounds

- Push must reach the user **with the app closed** (current NBD-28 is foreground-only).
- **Three sounds**, one per notification moment:
  1. اقتربت الصلاة (pre-prayer reminder),
  2. الأذان itself — **الفجر has its own distinct adhan**, other prayers share one,
  3. الإقامة (iqama-length sound only).
- Any three decent sounds for now — per-user sound customization is a later round.
- Sourcing: open-licensed recordings (or generated) — agent's choice, license-clean.
- Web-platform limits on notification sounds (OS-controlled when app closed) must be
  stated honestly in UI copy, like NBD-28 did.

## §6 Wird checklist restructure — rawatib + أذكار الصلاة

For levels that include سنن الرواتب (L2/L3):

- Rawatib are **separate checkboxes**, not one combined item, **ordered around their
  prayer**: سنة الفجر القبلية → صلاة الفجر → … ; سنة الظهر القبلية → صلاة الظهر →
  سنة الظهر البعدية; and so on.
- أذكار الصلاة is **not one item at the end**: it is a checkbox **after each prayer**.

## §7 Adhkar flow state preservation (صباح/مساء only)

- أذكار الصباح and أذكار المساء are said **once per day** → their guided-flow position
  (which dhikr + tap count) must be **preserved for the current day**, so an interrupted
  user resumes where they stopped (including across tab switches / reloads).
- All other categories (بعد الصلاة، النوم، …) may repeat many times a day → keep the
  current non-persistent behavior.
- Keep the current sequential flow UI as-is otherwise.
