# Design notes — R6 (owner intake, 2026-07-16, voice notes)

Owner-requested round 6, captured verbatim-in-spirit. Each § becomes a backlog ticket
(NBD-47…NBD-54); per-ticket planning happens before its implementation (files touched,
changes, alternatives, chosen option), same discipline as R4. NBD-47 additionally gets an
owner plan-review gate before any code (owner asked explicitly).

Most of this round is **plumbing that fell half-through earlier rounds** — the pieces exist,
they were just left unlinked or under-designed — plus one genuinely new data feature (NBD-47).

## Decisions locked this round

1. **Streak across an item's absence (owner's top concern).** When a tracked item (e.g. a
   raatibah) is dropped by a level change and later re-added, its per-item **streak bridges
   the gap — pause, not break.** You cannot break a streak on a day the deed was not part of
   your wird. Absent days are `N/A`: they neither extend nor break the streak, and they are
   excluded from consistency/miss counts entirely. Re-adding resumes from before the gap. The
   drill-down shows the item's active periods so a bridged long gap is transparent, not hidden.
   Past days are **never rewritten** — each day keeps the version in force then (ADR-0006).
2. **Weekly fasting (الإثنين/الخميس) is a soft target, not a hard schedule.** The deed is
   voluntary and **checkable any day**; الإثنين/الخميس are highlighted as the target (2/week).
   Any fasting day counts; missing a Monday is never a "miss." This loosens the current
   `weekdays` schedule (which hides the item on other days). Monthly fasting (٣/شهر) already
   behaves this way (shows every day, counts done-days toward 3) and stays as-is.
3. **Voluntary (تطوّع) deeds never read as failure** (ADR-0008, reaffirmed). Their per-item
   stat is **attainment vs target** (times done, best run, target progress) — no miss/shame
   figure.
4. **NBD-43 (push backend) is obsolete** and removed — superseded by the native AlarmManager
   shell (NBD-46 / ADR-0012). See §9.

## §1 Geolocation permission fix + Settings location control (NBD-48) — bug, first

**What.** (a) Fix the "تفعيل تحديد الموقع" button that does nothing, and (b) add a location
control to the Settings page so a user who skipped it in onboarding can grant it later.

**Current state.** The button path is sound in code: `requestCoords()` in
[`lib/impure/location.ts`](../../lib/impure/location.ts) branches to the Capacitor Geolocation
plugin on native (plugin registered in `capacitor.settings.gradle`; `ACCESS_FINE/COARSE_LOCATION`
declared). Settings ([`app/settings/page.tsx`](../../app/settings/page.tsx)) currently hosts
only Appearance / Sound / Method — no location control.

**Likely root cause (verify on device).** The shell is a **remote-URL** wrapper
(`capacitor.config.ts` → `server.url` = production). If the deployed production build predates
NBD-46, the loaded JS has no native branch and falls back to `navigator.geolocation`, which a
remote-origin Android WebView denies silently. Ranked hypotheses to confirm with `logcat`:

1. Production not yet on the NBD-46 build (no native branch in the served JS).
2. `getCurrentPosition` timing out with no fix → caught → returns `null` silently.
3. Plugin call rejects (permission dialog dismissed) → silent `null`.

**Approach.**

- New `features/settings/components/LocationSettings.tsx`: shows granted/not-granted state and
  a "تفعيل تحديد الموقع" button calling the same `requestCoords()`; re-request path on denial.
  Mounted in `app/settings/page.tsx`.
- Surface failures instead of swallowing them: `requestCoords()` returns `null` today for both
  "denied" and "error". Keep the silent UI, but add a `logger`-level breadcrumb on the failure
  branches so device logs show which hypothesis is true; add a short user-visible note when a
  request resolves to no-location ("تعذّر الحصول على الموقع — تأكد من صلاحية الموقع للتطبيق").
- Confirm production is on the NBD-46 build; if not, that is the fix (a deploy), not code.

**Files.** `features/settings/components/LocationSettings.tsx` (new), `app/settings/page.tsx`,
`lib/impure/location.ts` (breadcrumbs + a small typed failure reason), a colocated test for the
new hook/logic if any pure logic is added.

**Acceptance.** In Settings, a user without location sees an enable button; tapping it prompts
and, on grant, flips to a granted state and every prayer-times consumer updates live. On the
web preview the button grants location and the times render.

## §2 Surface the مواقيت الصلاة page (NBD-50)

**What.** The dedicated page `/prayer-times` exists (NBD-38) but is unreachable: it is not in
the bottom nav, and its only door — the status line in `PrayerTimesBar` — appears only once
location is granted. Give it an always-visible entry point.

**Approach (chosen, superseded — see amendment).** Add a "مواقيت الصلاة" icon link in the
**home header**, beside the settings gear (`app/page.tsx`), → `/prayer-times`. Keep the existing
status-line door.

**Amendment (owner decision, post-review).** The header icons were reviewed and reversed: both
مواقيت الصلاة **and** الإعدادات move into the **bottom nav**, which becomes a **five-item pill**
(RTL: المكتبات، المواقيت، الرئيسية — center — الإحصائيات، الإعدادات). The home header keeps only
the theme toggle and the auth chip. The status-line door stays. `/qada` lights الإحصائيات (its
door is the stats page).

**Files.** `components/shared/BottomNav.tsx` (five items), `app/page.tsx` (header cleanup).

**Acceptance.** From any page, one bottom-nav tap reaches مواقيت الصلاة and الإعدادات without
granting location first; home center stays.

## §3 Adhkar library ↔ home sync for الصباح/المساء (NBD-51)

**What.** Checking the wird item (أذكار الصباح / أذكار المساء) on home should make the library
tab for that category show as **finished** ("أتممت أذكار هذا القسم") — the reverse of the link
that already exists (finishing the library flow marks the wird item, NBD-29).

**Approach (chosen).** In `useAdhkarFlow`, for a linked once-daily category (`morning`/`evening`
via `CATEGORY_TO_WIRD_ITEM`), on mount also read whether the linked wird item is **done today**;
if so, initialise the flow state to `finished`. **Derived on read — no new stored state.** The
`adhkarFlow` store stays device-local and positional; the durable truth remains the wird entry.
Add a small `db.ts` read (e.g. `isWirdItemDoneToday(day, itemId)`) that resolves the version in
force and the latest entry state — reusing `versionInForce` + `latestStateByItem`.

**Alternatives.** Writing a `finished` `adhkarFlow` row when the wird item is checked — rejected:
duplicates truth into two stores that can disagree, and couples the wird toggle to the adhkar
feature. Read-derivation keeps a single source.

**Files.** `features/adhkar/hooks/useAdhkarFlow.ts`, `features/adhkar/db.ts` (+ test),
reuse `lib/pure/wird` helpers.

**Acceptance.** Check أذكار المساء on home → open the library مساء tab → it shows finished with
the restart affordance; the direct-in-library path still works.

## §4 بعد الصلاة / النوم → independent per-dhikr counter list (NBD-52)

**What.** For `after-prayer` and `sleep` **only**, replace the single guided "swapping" card
(`AdhkarFlow`) with a **scrollable list where each dhikr is its own card** carrying its own
counter (e.g. ١/١ or ٣٣/٣٣) and a **reset** button beside it. No finish celebration, no
auto-advance. The current "كل أذكار القسم" reference list effectively **becomes the page**.

**Rationale.** These categories are repeatable and not linked to a wird item
(`CATEGORY_TO_WIRD_ITEM` has no mapping for them — "they make no status"). The guided
single-card flow with a completion celebration is wrong for them; the owner wants a reference
list where each dhikr is independently counted and re-countable. أذكار الصباح/المساء keep the
guided flow + celebration exactly as they are ("زي العسل").

**Approach.** New `features/adhkar/components/AdhkarList.tsx`: maps `category.items` to
independent counter cards (tap-to-count to `repeat`, then a done state + reset). State is
**ephemeral (in-memory)** — these categories reset every visit by design, so no Dexie. Reset
zeroes a single card. `AdhkarTabs` routes: `morning`/`evening` → `AdhkarFlow`;
`after-prayer`/`sleep` → `AdhkarList`. The per-card counter reuses the tap-progress visual from
`AdhkarFlow` (extract the shared bits rather than duplicate).

**Files.** `features/adhkar/components/AdhkarList.tsx` (new),
`features/adhkar/components/AdhkarTabs.tsx` (routing), possibly a small shared counter-card
subcomponent, constants copy, e2e `e2e/adhkar.spec.ts` update.

**Acceptance.** On the بعد الصلاة and النوم tabs, every dhikr is its own card with an independent
counter and reset; counting one does not advance another; no celebration appears. الصباح/المساء
unchanged.

## §5 Split غير الرواتب into individual checklist items (NBD-53)

**What.** L3 currently carries one lumped `ghair-rawatib` checkbox with a long `minimum` string.
Replace it with **individual checklist items**, one per non-raatibah sunnah, each with a stable
id (e.g. `ghair-rawatib-asr-before` = ٤ قبل العصر، `ghair-rawatib-maghrib-before` = ٢ قبل
المغرب، `ghair-rawatib-isha-before` = ٢ قبل العشاء، and the ظهر ٤ before / ٤ after set).

**Interaction with versioning.** Changing `content/levels.ts` triggers
`upgradeVersionToCurrentLevel` (its own comment anticipates exactly this: "rawatib split into
per-prayer items"): existing L3 users get a **new version** effective today/tomorrow; past days
keep the old snapshot, so **stats never move**. The old `ghair-rawatib` history stays under the
old versions; the new items begin their history from their effective date. **No data migration.**

**Care.** `levelMatching` identifies the level by dhikr-counter target (١٠/٥٠/١٠٠) — untouched by
this change, so self-upgrade keeps matching L3. Verify with a test.

**Files.** `content/levels.ts`, `features/wird/__tests__` (level-matching + upgrade still hold),
possibly `e2e` selectors if any referenced `ghair-rawatib`.

**Acceptance.** On L3 the checklist lists the non-raatibah sunan as separate ordered items; an
existing L3 user's past stats are unchanged after the auto-upgrade.

## §6 Weekly fasting as a soft target (NBD-54) — touches ADR-0008

**What.** صيام الإثنين والخميس should be **checkable any day** with الإثنين/الخميس shown as the
target, per decision (2). Today the `weekdays` schedule hides it on other days.

**Approach.** Introduce a target-vs-hard distinction for scheduled voluntary deeds. Two options
to settle in the ticket's plan (needs a one-line ADR-0008 amendment either way):

- **A (preferred):** add an optional `targetDays?: number[]` field for voluntary items and stop
  using `weekdays` for fasting; `isScheduledOn` returns true every day, the UI highlights
  `targetDays`. Weekly attainment = done-days on//off target counted toward 2/week.
- **B:** keep `weekdays` but change its semantics for `optional` items to "target, not filter."
  More implicit; A is more explicit and safer.

**Files.** `types/wird.ts` (schedule/target field), `lib/pure/wird.ts` (`isScheduledOn` +
attainment helper), `content/levels.ts` (fasting item), `features/wird` view + tests,
`docs/adr/0008-*` (amendment).

**Acceptance.** صيام shows every day; fasting on a Wednesday counts; الإثنين/الخميس are marked as
the target; no "miss" is ever recorded for a non-fasted day.

## §7 Alarm debug panel (NBD-49) — temporary

**What.** A temporary in-app tool to confirm the native alarm actually fires without waiting for
عشاء, and to schedule a custom test alarm.

**Approach.** New `features/settings/components/AlarmDebug.tsx`, rendered in Settings **only
inside the native shell** (`isNativePlatform()` guard, hidden on web). Buttons: "جرّب أذاناً بعد
دقيقة" (schedules a one-off `LocalNotifications` at now+60s on the adhan channel), a custom
minutes input, and a "الإنذارات المجدولة" list from `LocalNotifications.getPending()`. Add a
thin `scheduleTestAlarm(atMs)` / `listPendingAlarms()` to `native-alarms.ts`. Marked TEMPORARY
with a removal note; tracked to be deleted once the owner confirms alarms work.

**Files.** `features/settings/components/AlarmDebug.tsx` (new),
`features/prayer-times/native-alarms.ts` (test helpers), `app/settings/page.tsx`.

**Acceptance.** Inside the shell, tapping the debug button produces a real notification with the
adhan sound ~1 minute later, and the pending list reflects scheduled alarms. Web build unaffected
(panel absent).

## §8 Per-item detailed stats (NBD-47) — ⛔ owner plan-review gate

**Goal.** A drill-down for **every wird checklist item** (each prayer, each dhikr, quran, …):
consistency %, current streak, misses-in-a-row, total missed vs completed. Feeds the محاسبة
review and later the qada auto-add.

### Data model — derive-only, zero new tables, zero migration

The versioned append-only model already encodes everything needed; per-item stats are a **pure
computation** over the data stats already reads:

- `WirdEntry` is append-only per `(day, itemId)` and stores its `versionId`.
- `WirdVersion` snapshots the full definition with `effectiveFrom`.
- A word change creates a new version (via `upgradeVersionToCurrentLevel`); past days resolve to
  their own version, so history is stable (ADR-0006).

Per-item history is therefore joinable by `itemId` across versions, because **item ids are
stable across levels** (documented in `content/levels.ts`). No `itemStats` table, no per-toggle
denormalization.

### "Due" per item per day — the definition that survives word changes

For item `X` on day `D`:

- Resolve `V = versionInForce(D)`.
- `X` is **present** iff `V.definition.items` contains id `X`.
- `X` is **due** = present ∧ `isScheduledOn(X, D)` ∧ not `optional` ∧ `D ≤ today`.
- State = `latestStateByItem(entriesOn(D)).get(X)`.
- Classify a **due** day: `done` or `miss`.
- A day where `X` is not present / not scheduled → **N/A**: never a miss, never a streak break.

This is what answers the owner's top scenario (tracked → level-down → untracked → re-added):
during absence the item is `N/A`, so **no misses accrue and the old history is untouched**; on
re-add (same stable id) history resumes.

### Metrics

| Metric              | Definition                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Consistency %       | done-days ÷ **due**-days (N/A excluded)                                                                                              |
| Current streak      | consecutive `done` due-days ending at the last due-day, **bridging** N/A gaps; today gets grace (an unfinished today is not a break) |
| Misses-in-a-row     | consecutive `miss` due-days most recently                                                                                            |
| Total done / missed | counts over due days                                                                                                                 |

- **Streak bridges gaps** per decision (1). The drill-down also surfaces the item's active
  spans so a bridged gap is visible.
- **Voluntary items** (تطوّع, incl. fasting): show _attainment vs target_ — times done, best
  run, weekly/monthly target progress — **no miss figure** (decision 3). Monthly-goal fasting
  uses a **per-month** attainment metric, not a day streak.

### Alternatives considered

- ✅ **Derive-only (chosen).** No schema/sync change; past data automatically correct; single
  source of truth. Full-history scan is trivial at one-user scale; a memoised/incremental cache
  can be added later if ever needed.
- ❌ **Aggregate `itemStats` table updated per toggle.** A denormalized copy that can disagree
  with the entries, needs a migration + a sync mapper, and must be recomputed anyway whenever a
  version change retroactively changes what "due" means. More failure modes, no scale benefit.

### Work breakdown

- `lib/pure/wird.ts` or `stats/logic.ts`: `itemDueDays`, `itemHistory`, `itemStreak`,
  `itemConsistency`, `itemMisses`, `itemAttainment` (voluntary) — all pure, table + property
  tested (esp. "past day's per-item stats never change when a version is added").
- `stats/db.ts`: load all versions + entries (or a bounded range) for the drill-down.
- `stats/types.ts`: `ItemStat` view shape.
- UI: a per-item drill-down (from the checklist and/or the stats page).

### Acceptance

Every current checklist item opens to its own history — streak, consistency, and missed count
match the stored entries; a level change that drops then re-adds an item bridges its streak and
never fabricates misses for the absent days; a past day's per-item numbers do not move when a
new version is added.

## §9 Remove NBD-43 (push backend) (NBD-43 → won't-do)

Obsolete: notifications are delivered by the native AlarmManager shell (NBD-46 / ADR-0012), so
the web-push backend (VAPID edge function, `push_schedule`/`push_subscriptions` tables) is not
needed. No code removal (the tables/function were never built — NBD-43 was on hold). Actions:
mark NBD-43 **won't-do** in the backlog, set ADR-0011 status to _superseded by ADR-0012_.

## Build order

Bug + quick wins first, model/content next, stats last (gated):
**NBD-48 → NBD-50 → NBD-43(remove) → NBD-51 → NBD-52 → NBD-53 → NBD-54 → NBD-49 → NBD-47.**
Each ticket runs the full `docs/workflow.md` loop (branch → pure→db→hooks→components→route →
colocated tests → `lint && typecheck && test && build` green → live browser verification).
NBD-47 pauses after its written plan for owner review before any code.
