# Backlog — nabd

`NBD-N` are planning IDs; each becomes a **GitHub issue** when picked up, and branches/commits
reference that issue number. Tickets are roughly in dependency order — inner infrastructure
first. Every ticket has one acceptance criterion. The core of the MVP is **NBD-7 (daily wird
checklist)** and **NBD-8 (statistics)**.

| ID     | Ticket                                                                             | Acceptance criterion                                                                                                                |
| ------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| NBD-1  | **Bootstrap** — run `docs/stack.md` §1; define scripts; green baseline             | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0 on a fresh clone                                                |
| NBD-2  | **Feature-folder structure + import-boundary lint** (`docs/architecture.md`)       | Folder skeleton exists; a deliberate `logic.ts → db.ts` import makes `pnpm lint` fail                                               |
| NBD-16 | **CI workflows** (ADR-0005) — six GitHub Actions checks                            | `lint`, `typecheck`, `test`, `e2e`, `build`, `colocated-test-check` each run as a required check on PRs to `dev`/`master`           |
| NBD-3  | **Import design tokens from Claude Design** (ADR-0007) via `claude_design` MCP     | `DESIGN_SYSTEM.md` value tables + `app/globals.css` `@theme` hold the real palette, fonts, and scales; no placeholder tokens remain |
| NBD-4  | **Supabase Auth (OAuth) + session**                                                | A user can sign in with the OAuth provider and a session persists across reloads                                                    |
| NBD-5  | **Dexie schema + local↔Supabase sync scaffolding** (needs ADR-0006 accepted)       | A record written offline in Dexie appears in Supabase after reconnect, and vice versa                                               |
| NBD-6  | **Onboarding questionnaire + levels** (2 of 4 at launch)                           | A new user answers the questionnaire and lands on a daily wird sized to the chosen level                                            |
| NBD-7  | **Daily wird checklist** (core)                                                    | The user checks off a wird item and it stays checked after an offline reload                                                        |
| NBD-8  | **Statistics + drill-down** (core; needs ADR-0006)                                 | A checked-off item is reflected in the matching statistic; a past day's stats never change when the wird version changes            |
| NBD-9  | **Dhikr counter** (connected to the checklist)                                     | Finishing the counter for a dhikr auto-marks its linked wird item complete                                                          |
| NBD-10 | **Today summary** (done vs. remaining)                                             | The summary counts always match the current checklist state                                                                         |
| NBD-11 | **Observability** — Sentry + Vercel Analytics setup                                | A thrown error appears in Sentry with full detail; page views appear in Vercel Analytics; keys are in `.env.example`                |
| NBD-12 | **Adhkar library**                                                                 | The user can browse the adhkar reference without an entry existing in their wird                                                    |
| NBD-13 | **Intentions library** (نوايا per deed)                                            | The user can open the intention text for a given deed                                                                               |
| NBD-14 | **SEO basics** — per-page meta/OG, sitemap, robots.txt, semantic landing page      | Each public page has meta/OG tags; `/sitemap.xml` and `/robots.txt` resolve; the landing page renders server-side                   |
| NBD-15 | **PWA** — `manifest.ts` + Serwist SW + deliberate update notifier                  | App is installable; offline reload works; a new SW shows an "update available" prompt instead of auto-updating                      |
| NBD-17 | **Reconfigure Vercel project** for the single Next.js app (root dir, framework)    | Vercel builds from repo root; `dev` → staging and `master` → production per ADR-0003                                                |
| NBD-18 | **Fix sub-AA `muted-foreground` contrast** in the Claude Design project, re-import | `muted-foreground` on `bg` meets body AA (≥ 4.5) in both Classic and Modern; re-imported into `globals.css`                         |

## Later (out of scope for MVP)

- Levels 3 and 4 of the questionnaire / wird difficulty.

## Notes

- **ADR-0006 (wird versioning) is a hard prerequisite** for NBD-5 and NBD-8 — settle and
  accept it before writing statistics or durable checklist persistence.
- **NBD-3 (design tokens)** is a prerequisite for every visual/UI ticket (NBD-6 onward).
- New ideas discovered mid-build → add as new rows here, never as silent scope creep.
