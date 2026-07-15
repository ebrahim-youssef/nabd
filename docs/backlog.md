# Backlog — nabd

`NBD-N` are planning IDs; each becomes a **GitHub issue** when picked up, and branches/commits
reference that issue number. Tickets are roughly in dependency order — inner infrastructure
first. Every ticket has one acceptance criterion. The core of the MVP is **NBD-7 (daily wird
checklist)** and **NBD-8 (statistics)**.

| ID     | Status  | Ticket                                                                             | Acceptance criterion                                                                                                                |
| ------ | ------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| NBD-1  | ✅ done | **Bootstrap** — run `docs/stack.md` §1; define scripts; green baseline             | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0 on a fresh clone                                                |
| NBD-2  | ✅ done | **Feature-folder structure + import-boundary lint** (`docs/architecture.md`)       | Folder skeleton exists; a deliberate `logic.ts → db.ts` import makes `pnpm lint` fail                                               |
| NBD-16 | ✅ done | **CI workflows** (ADR-0005) — six GitHub Actions checks                            | `lint`, `typecheck`, `test`, `e2e`, `build`, `colocated-test-check` each run as a required check on PRs to `dev`/`master`           |
| NBD-3  | ✅ done | **Import design tokens from Claude Design** (ADR-0007) via `claude_design` MCP     | `DESIGN_SYSTEM.md` value tables + `app/globals.css` `@theme` hold the real palette, fonts, and scales; no placeholder tokens remain |
| NBD-4  | ✅ done | **Supabase Auth (OAuth) + session**                                                | A user can sign in with the OAuth provider and a session persists across reloads                                                    |
| NBD-5  | ✅ done | **Dexie schema + local↔Supabase sync scaffolding** (needs ADR-0006 accepted)       | A record written offline in Dexie appears in Supabase after reconnect, and vice versa                                               |
| NBD-6  | ✅ done | **Onboarding questionnaire + levels** (2 of 4 at launch)                           | A new user answers the questionnaire and lands on a daily wird sized to the chosen level                                            |
| NBD-7  | ✅ done | **Daily wird checklist** (core)                                                    | The user checks off a wird item and it stays checked after an offline reload                                                        |
| NBD-8  | ✅ done | **Statistics + drill-down** (core; needs ADR-0006)                                 | A checked-off item is reflected in the matching statistic; a past day's stats never change when the wird version changes            |
| NBD-9  | ✅ done | **Dhikr counter** (connected to the checklist)                                     | Finishing the counter for a dhikr auto-marks its linked wird item complete                                                          |
| NBD-10 | ✅ done | **Today summary** (done vs. remaining)                                             | The summary counts always match the current checklist state                                                                         |
| NBD-11 | ✅ done | **Observability** — Sentry + Vercel Analytics setup                                | A thrown error appears in Sentry with full detail; page views appear in Vercel Analytics; keys are in `.env.example`                |
| NBD-12 | ✅ done | **Adhkar library**                                                                 | The user can browse the adhkar reference without an entry existing in their wird                                                    |
| NBD-13 | ✅ done | **Intentions library** (نوايا per deed)                                            | The user can open the intention text for a given deed                                                                               |
| NBD-14 | ✅ done | **SEO basics** — per-page meta/OG, sitemap, robots.txt, semantic landing page      | Each public page has meta/OG tags; `/sitemap.xml` and `/robots.txt` resolve; the landing page renders server-side                   |
| NBD-15 | ✅ done | **PWA** — `manifest.ts` + Serwist SW + deliberate update notifier                  | App is installable; offline reload works; a new SW shows an "update available" prompt instead of auto-updating                      |
| NBD-17 | ✅ done | **Reconfigure Vercel project** for the single Next.js app (root dir, framework)    | Vercel builds from repo root; `dev` → staging and `master` → production per ADR-0003                                                |
| NBD-18 | ✅ done | **Fix sub-AA `muted-foreground` contrast** in the Claude Design project, re-import | `muted-foreground` on `bg` meets body AA (≥ 4.5) in both Classic and Modern; re-imported into `globals.css`                         |

## R2 — post-MVP update round (2026-07-15 intake)

Owner-requested updates, split into tickets. Order below is the build order (dependencies
inline). New design decisions live in ADR-0008 (schedules/optional items) and ADR-0009
(prayer times & notifications).

| ID     | Status | Ticket                                                                                                                                                                                                                                                   | Acceptance criterion                                                                                                                                  |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| NBD-19 | —      | **Tighten global spacing** — kill the oversized top/around padding; mobile-first, still balanced on desktop                                                                                                                                              | Header sits near the top on mobile (no large blank band); no horizontal crowding on desktop                                                           |
| NBD-20 | —      | **Visual today-progress** — replace "إنجاز ٤ من ٩" text with a progress ring (numbers inside)                                                                                                                                                            | The ring fills to done/required and always matches the checklist state                                                                                |
| NBD-21 | —      | **Checklist area accordions** — area name (start) + ٤/٥ count (end); open by default, collapsible                                                                                                                                                        | Collapsing an area hides its items but keeps its header count live; state survives toggling                                                           |
| NBD-22 | —      | **Bottom navbar + pages** — stats (start) / home (center) / libraries (end); `/stats` page; libraries hub; persistent back header on sub-pages                                                                                                           | Stats render on their own page; every sub-page can navigate back without scrolling; navbar fixed on mobile                                            |
| NBD-23 | —      | **Adhkar library v2** — categories as accordions + full islambook content (صباح/مساء + بعد الصلاة/نوم) with per-dhikr فضل; scraped via script                                                                                                            | Each category expands/collapses; every dhikr shows text, count, and فضل/source; content generated by `scripts/scrape-adhkar.mjs`                      |
| NBD-25 | —      | **Wird schedules & optional items** (ADR-0008) — `schedule` (daily / monthly-goal / weekdays) + `optional`/`minimum`; stats & summary aware                                                                                                              | A monthly-goal item shows month progress; a weekdays item appears only on its days; optional items never lower required completion                    |
| NBD-26 | —      | **Levels revamp (3 levels)** — L1 + five adhkar counters ×10 + تطوّع (قيام ١، ضحى ٢، صيام ٣/شهر); L2 (جماعة، رواتب، أذكار بعد الصلاة، حزب، ×٥٠، قيام ٣، ضحى ٢، صيام ٣/شهر); L3 جديد (+غير الرواتب، جزء، ×١٠٠، صيام الإثنين والخميس); onboarding offers 3 | A new user can land on any of the three levels and sees the right items incl. تطوّع and periodic صيام (needs NBD-25)                                  |
| NBD-27 | —      | **Prayer times** (ADR-0009) — adhan.js + location permission; time beside each prayer; live non-collapsing sub-header (٣٠-min windows incl. الشروق)                                                                                                      | With location granted, each prayer shows its time and the sub-header ticks through أذّن منذ/باقي على correctly; denied ⇒ quiet prompt, nothing breaks |
| NBD-28 | —      | **Prayer notifications** (ADR-0009) — onboarding permission + prefs (قبل بربع ساعة / عند الأذان / عند الإقامة، بأوقات الإقامة الثابتة); distinct foreground sounds                                                                                       | Opted-in user gets the chosen notifications while the app is open; sounds differ per moment; all limits stated in UI copy (needs NBD-27)              |
| NBD-29 | —      | **Wird ↔ adhkar linking** — أذكار الصباح/المساء items link to their library category; checking adhkar one-by-one in the library auto-marks the wird item when complete                                                                                   | Both paths work: direct check-off on home, or completing all adhkar in the library marks the home item (needs NBD-23 + NBD-26)                        |
| NBD-24 | —      | **Intentions library v2** — curated additions from كتاب "نوايا" (طلال فاخر) with attribution; keep the disclosure list                                                                                                                                   | The library carries the expanded curated set with a source note; each deed still opens to its intention                                               |

Deferred from this round: أذكار الصلاة ↔ wird linking (five instances per day — revisit after
NBD-29); custom notification sounds + push backend (after ADR-0009's future upgrade);
calculation-method picker for prayer times.

## Later (out of scope for MVP)

- Level 4 of the questionnaire / wird difficulty (level 3 ships in NBD-26).

## Notes

- **ADR-0006 (wird versioning) is a hard prerequisite** for NBD-5 and NBD-8 — settle and
  accept it before writing statistics or durable checklist persistence.
- **NBD-3 (design tokens)** is a prerequisite for every visual/UI ticket (NBD-6 onward).
- New ideas discovered mid-build → add as new rows here, never as silent scope creep.

## MVP release

All 18 tickets shipped in **v0.14.1** (release PR #68, 2026-07-15) — verified on production:
questionnaire → level-sized wird → check-off → offline reload persists → libraries render →
sitemap/robots resolve. Live login + cross-device sync additionally require the Google OAuth
provider to be enabled in the Supabase dashboard (manual, outside the repo).
