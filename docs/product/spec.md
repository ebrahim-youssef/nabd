# Product Spec — nabd

> Migration scope: this document describes the legacy Next.js/PWA product contract. For the
> replacement SPA and Android clients, ADR-0014 and
> `docs/migration/2026-08-10-execution-plan.md` supersede the PWA, web-offline, Supabase/auth,
> data-migration, hosting, and release assumptions. The devotional feature behavior remains the
> parity reference.

Daily wird (ورد) companion for Muslims — helps you commit to a daily devotional routine,
track it, hold yourself accountable (محاسبة), and reflect on your worship over time.

## Users & core job

Muslims who want to keep a consistent daily wird — core job: make the user stick to a daily
wird and give them self-accountability and reflection over everything they committed to and
did.

## Platform & constraints

- Platform: PWA (installable, offline-first)
- Offline: offline-first — local data is the source of truth; sync is a background concern
- Data: hybrid — local IndexedDB (Dexie) offline, synced to Supabase across devices
- Auth: OAuth via Supabase Auth (enables cross-device sync)
- Locales: Arabic (default ar, RTL) — Arabic-only, no i18n layer

## MVP features (in scope)

1. **Onboarding questionnaire** — on first entry, a short questionnaire places the user in a
   level. Levels define the difficulty and time commitment of the daily wird (adhkar, Quran,
   prayers). Four levels planned; launch with two.
   *Acceptance: a new user answers the questionnaire and lands on a daily wird sized to the
   chosen level.*
2. **Auth & sync** — OAuth login; after login the user's data syncs to Supabase so the PWA
   works across devices (phone, PC).
   *Acceptance: a logged-in user sees the same wird and history on a second device.*
3. **Daily wird checklist** — one page listing today's wird as a simple checklist (prayers,
   sunan, extra awrad, Quran portion, adhkar, fasting); the user checks items off. **The core
   feature.**
   *Acceptance: the user checks off a wird item and it stays checked after reload, offline.*
4. **Statistics** — per-area stats and drill-down (how am I doing on Fajr, on prayers
   overall, on sunan, …). **The other core feature.**
   *Acceptance: a checked-off item is reflected in the matching statistic within the same
   session.*
5. **Dhikr counter** — a counter page showing the dhikr with a tap button; counts each
   recitation, and on completion automatically marks the linked wird item as done (counter
   and checklist are connected).
   *Acceptance: finishing the counter for a dhikr auto-marks its wird item complete.*
6. **Today summary** — a simple "how is today going" view: done vs. remaining.
   *Acceptance: the summary count matches the checklist state at all times.*
7. **Adhkar library** — a small reference library of adhkar.
   *Acceptance: the user can browse adhkar without an entry existing in their wird.*
8. **Intentions library** — a small reference of intentions (نوايا) per deed.
   *Acceptance: the user can open the intention for a given deed.*

### Cross-cutting design constraint — malleable wird

The wird definition changes over time (e.g. 5 prayers without sunan → later with sunan; 1
juz → 2 juz). The data model must **version** these changes so statistics stay correct across
redefinitions and sync cleanly. See ADR-0002 (architecture) and ADR-0006 (wird versioning).

## Later (out of scope for MVP)

- Levels 3 and 4 of the questionnaire / wird difficulty.

## Discoverability

Public product → SEO basics are in scope: per-page meta/OG tags, sitemap, robots.txt, and a
semantic public landing page (see `docs/backlog.md`).

## Success check (production smoke test)

I can log in, answer the questionnaire, check off a wird item, go offline and reload and it
is still checked, then reconnect and see it synced and reflected in the statistics.
