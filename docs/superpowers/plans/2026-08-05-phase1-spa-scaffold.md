# Phase 1 — SPA Scaffolding + Shared Package Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up `apps/spa` (Vite + React Router) and `packages/shared` as a working pnpm
workspace alongside the untouched Next.js root app, with a real landing page deployed and the
shared package proven consumed — without breaking the existing Next.js gates.

**Architecture:** pnpm workspace rooted at the existing repo root (the Next.js app stays the root
package). `apps/spa` and `packages/shared` are new workspace packages with their own
package.json/tsconfig/eslint, explicitly excluded from the root Next.js lint/typecheck scope.

**Tech Stack:** Vite, React Router, TypeScript strict, Vitest, Playwright, Tailwind v4.

## Global Constraints

- Next.js root app must stay green (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`)
  after every task in this plan — verify, don't assume.
- Per ADR-0014 / migration roadmap: no PWA/offline in the SPA, landing page only owns SEO,
  `/app/*` namespace reserved (not built yet — out of scope for this phase).
- `packages/shared` is platform-neutral only: types, pure logic ported from `lib/pure/*`, Arabic
  copy, design tokens. No Dexie/Supabase/routing/Capacitor code.

---

### Task 1: Workspace wiring — prove the old app survives

**Files:**

- Modify: `pnpm-workspace.yaml` (add `packages:` field)
- Modify: `tsconfig.json` (exclude `apps/**`, `packages/**`)
- Modify: `eslint.config.mjs` (globalIgnores add `apps/**`, `packages/**`)
- Create: `apps/.gitkeep`, `packages/.gitkeep` (placeholders so the globs resolve once real
  packages land)

**Interfaces:** none yet — no new packages exist. This task only proves the root app is inert to
their future presence.

- [ ] Add `packages:\n  - 'apps/*'\n  - 'packages/*'` to `pnpm-workspace.yaml` (keep the existing
      `ignoredBuiltDependencies` key).
- [ ] Add `'apps/**'` and `'packages/**'` to the `globalIgnores([...])` array in
      `eslint.config.mjs`.
- [ ] Add `"exclude": ["node_modules", "app/sw.ts", "apps", "packages"]` to `tsconfig.json`
      (extend the existing exclude array, don't replace `app/sw.ts`).
- [ ] Create `apps/.gitkeep` and `packages/.gitkeep` so the directories exist for the next tasks.
- [ ] Run `pnpm install` (picks up the new workspace globs — should be a no-op since no packages
      exist yet).
- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all four must exit 0,
      identical outcome to before this task (this is the proof the old app is unaffected).
- [ ] Commit: `chore: scope root gates to exclude apps/ and packages/ workspaces`

### Task 2: `packages/shared` — tokens + pure logic, standalone

**Files:**

- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/shared/src/logic/` (ported from `lib/pure/day.ts`, `format.ts`, `wird.ts`)
- Create: `packages/shared/src/tokens/` (design tokens — resolves migration-plan spike #1:
  single JSON/TS source of truth that both the web `@theme` CSS and the future NativeWind config
  can read from)
- Create: `packages/shared/src/copy/` (Arabic copy extracted from `README.md` value-prop content
  and any hardcoded UI strings worth centralizing now)
- Test: `packages/shared/src/logic/__tests__/*.test.ts` (port the existing
  `lib/__tests__/day.test.ts`, `format.test.ts` equivalents)

**Interfaces:**

- Produces: `@nabd/shared` package, consumable via workspace protocol
  (`"@nabd/shared": "workspace:*"`). Exports pure functions matching `lib/pure/*`'s existing
  signatures (don't rename during the port — Task 3 imports these as-is).

- [ ] Scaffold `packages/shared/package.json` (name `@nabd/shared`, private, own `lint`/
      `typecheck`/`test` scripts using the same eslint/vitest versions as root, own minimal
      `tsconfig.json` — no Next.js `next` plugin, no `@/*` alias, strict TS).
- [ ] Port `lib/pure/day.ts`, `lib/pure/format.ts`, `lib/pure/wird.ts` into
      `packages/shared/src/logic/`, verbatim logic (no behavior changes) — these must stay pure
      per the existing eslint boundary rules, now enforced by the package's own lint config
      (write an equivalent no-restricted-imports rule for `packages/shared/src/logic/*` banning
      React/Dexie/Supabase/DOM imports).
- [ ] Port the matching tests from `lib/__tests__/day.test.ts`, `format.test.ts` into
      `packages/shared/src/logic/__tests__/`.
- [ ] Resolve migration-plan spike #1: extract the `app/globals.css` `@theme` token values into
      `packages/shared/src/tokens/tokens.ts` (or `.json`) as the source of truth. Do not yet wire
      this back into the Next.js app's CSS generation — that's a follow-up, not this task; the
      goal here is a single readable source, proven importable.
- [ ] Extract landing-page-relevant Arabic copy (app name, tagline, value-prop bullets) from
      `README.md`/`README.en.md` into `packages/shared/src/copy/landing.ts`.
- [ ] Run `pnpm --filter @nabd/shared lint && pnpm --filter @nabd/shared typecheck && pnpm --filter @nabd/shared test`
      — all green, standalone (nothing consumes this package yet).
- [ ] Run the root gates again (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`) — must
      stay green; the new package must not leak into root scope.
- [ ] Commit: `feat(shared): scaffold packages/shared with ported pure logic, tokens, copy`

### Task 3: `apps/spa` — Vite + React Router skeleton, consuming `packages/shared`

**Files:**

- Create: `apps/spa/package.json`, `apps/spa/vite.config.ts`, `apps/spa/tsconfig.json`
- Create: `apps/spa/src/main.tsx`, `apps/spa/src/router.tsx`
- Create: `apps/spa/index.html`

**Interfaces:**

- Consumes: `@nabd/shared`'s exported logic/tokens/copy from Task 2 (exact export names as
  scaffolded there).
- Produces: a running Vite dev server + production build at `apps/spa/dist/`.

- [ ] Scaffold `apps/spa` with Vite's React-TS template conventions (own `package.json` with
      `dev`/`build`/`lint`/`typecheck`/`test` scripts, `"@nabd/shared": "workspace:*"` dependency).
- [ ] Wire `react-router` with a single root route (placeholder, replaced by the real landing
      page in Task 4).
- [ ] Import one value from `@nabd/shared` (e.g. a pure logic function or a token) into the root
      route component — prove the workspace import resolves at both dev-server and build time,
      not just type-level.
- [ ] Run `pnpm --filter apps/spa dev` briefly (start, confirm it serves, stop) — don't leave it
      running.
- [ ] Run `pnpm --filter apps/spa build` — must produce `apps/spa/dist/` with no errors.
- [ ] Run the root gates again — must stay green.
- [ ] Commit: `feat(spa): scaffold Vite + React Router app, consumes @nabd/shared`

### Task 4: Landing page content + real metadata/icons

**Files:**

- Modify: `apps/spa/src/router.tsx` (or a new `apps/spa/src/routes/landing.tsx`)
- Create: `apps/spa/public/favicon.ico` (or reuse `app/favicon.ico`'s source asset)
- Modify: `apps/spa/index.html` (title, meta description, favicon link)

**Interfaces:**

- Consumes: `packages/shared/src/copy/landing.ts` from Task 2.

- [ ] Build the landing page component from the copy in `packages/shared/src/copy/landing.ts`
      (app name نبض/nabd, tagline, value-prop bullets already extracted).
- [ ] Wire real favicon/title/meta description in `apps/spa/index.html` (source the icon from the
      existing `app/favicon.ico`/`app/apple-icon.png` assets — copy, don't regenerate).
- [ ] Run `pnpm --filter apps/spa build` — confirm clean build with the real content.
- [ ] Commit: `feat(spa): build landing page from shared copy, real metadata`

### Task 5: SPA CI gate

**Files:**

- Create: `.github/workflows/spa-lint.yml`, `.github/workflows/spa-typecheck.yml`,
  `.github/workflows/spa-test.yml`, `.github/workflows/spa-build.yml` (or one combined
  `spa-ci.yml` with multiple jobs — prefer one file, matches this repo's one-workflow-per-concern
  pattern loosely but avoid four near-identical files if a single workflow with a job matrix reads
  cleaner)
- Modify: none of the existing six workflows (they stay scoped to the root Next.js app,
  unaffected — verified in Task 1)

**Interfaces:** none — CI config only.

- [ ] Add a workflow triggered on the same `[dev, master]` branches, running
      `pnpm --filter apps/spa lint`, `pnpm --filter @nabd/shared lint`, and the typecheck/test/
      build equivalents.
- [ ] Push and confirm the new workflow runs and passes on GitHub Actions; confirm the existing
      six workflows still pass unmodified.
- [ ] Commit: `ci: add SPA + shared package gate`

---

## Acceptance (Phase 1 done)

- Old Next.js app: all four root gates still green, byte-identical behavior.
- `packages/shared`: lints/typechecks/tests standalone, exports pure logic + tokens + copy.
- `apps/spa`: builds, serves a real landing page sourced from shared copy, real metadata/icons,
  imports proven from `packages/shared`.
- CI: new SPA gate green, existing six workflows unaffected.
