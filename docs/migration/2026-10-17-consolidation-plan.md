# Consolidation plan: one `native` folder, Vite+ tooling

- **Date:** 2026-10-17
- **Decision record:** [ADR-0017](../adr/0017-native-only.md), amended 2026-10-17
- **Tickets:** NBD-106, NBD-107, NBD-108, NBD-110, NBD-111, NBD-112 in
  [`docs/backlog.md`](../backlog.md) R12

## Goal

At the end, the repository holds one application folder, `native/`, containing every line of
product code: routes, features, pure logic, Arabic content, copy, theme, device code, the Kotlin
module, config plugins, and tests. `apps/`, `packages/`, the root Next.js app, the SPA, Capacitor,
and the Supabase client are gone. The repository root keeps only tooling that has to live there
(the pnpm workspace file, Git hooks, commitlint, CI, docs).

The developer toolchain is Vite+ (`vp`): Oxfmt formats, Oxlint lints, `vp staged` runs the
pre-commit checks. Metro, Jest with `jest-expo`, `tsc --noEmit`, EAS and Gradle stay, because Expo
supports only those for React Native.

## Decisions taken in this plan

1. **The legacy app is referenced through a Git tag, not kept in the tree.** The root Next.js app
   imports `@nabd/shared` (for example `features/stats/logic.ts`), so folding shared into native
   would break it. Before deletion, the last commit that contains it is tagged
   `legacy-reference`. Parity work (NBD-98 to NBD-105, NBD-91) reads the old behavior from that
   tag, for example with `git worktree add ../nabd-legacy legacy-reference`. This replaces the
   earlier "keep the root app until parity" rule in ADR-0017.
2. **`packages/shared` is folded into native, not kept as a package.** There is one client, so a
   separate package only adds a workspace boundary. Pure logic keeps its purity through a lint
   rule scoped to `logic.ts` files instead of a package boundary.
3. **Final folder is `native/` at the root.** `apps/native` moves there as the last structural
   step. The root stays a pnpm workspace with one member so hooks and CI can run from the root.
4. **Vite+ is installed as a pinned local dev dependency** (`vite-plus@1.0.0`, released
   2026-09-28, the newest release at least two weeks old). No global installer script.
5. **Kept as they are:** Jest and `jest-expo` for native tests, `tsc --noEmit`, commitlint, the
   malware-scan hooks (`pre-push`, `post-checkout`, `post-merge`, `post-rewrite`), the APK
   workflow, EAS profiles.

## Order and why

The hook fix comes first because the pre-commit hook currently hangs. Deletions come before the
fold-in, because folding shared breaks the root app and the SPA, and porting their imports would
be wasted work. Oxlint and Oxfmt come after the fold-in, so there is one lint config to write
instead of four. Parity features come last, after the folder layout stops moving, so feature
branches do not fight a repository-wide move.

| Phase | Ticket                                     | Size | What                                                 | Done when                                                                                             |
| ----- | ------------------------------------------ | ---- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1     | NBD-110a                                   | S    | Vite+ install and hooks                              | `vp staged` replaces husky pre-commit and lint-staged; a commit from a non-interactive shell finishes |
| 2     | NBD-106                                    | S    | Native boundary and CI                               | Native CI runs from native-owned scripts; `legacy-reference` tag pushed                               |
| 3     | NBD-107, NBD-108                           | M    | Delete SPA, root Next.js, Capacitor, Supabase client | Only `apps/native` and `packages/shared` remain as code; native gates green                           |
| 4     | NBD-111                                    | L    | Fold `packages/shared` into native                   | No `@nabd/shared` import remains; `packages/` is gone; all shared tests run under Jest                |
| 5     | NBD-112                                    | M    | Move to `native/`, workspace cleanup                 | `apps/native` is `native/`; root holds only tooling; EAS and APK builds pass                          |
| 6     | NBD-110b-d                                 | M    | Oxfmt, Oxlint, CI through `vp`                       | ESLint and Prettier are removed; one reformat commit is in `.git-blame-ignore-revs`                   |
| 7     | NBD-98 to NBD-105, NBD-91, NBD-89a, NBD-92 | L    | Parity features and release                          | As listed in the backlog                                                                              |

Every phase is one branch and one PR into `dev`, merged with a normal merge commit. Each chunk is
built by a runner test-first, reviewed, and gated (`lint`, `typecheck`, `test`, Expo export) before
the next chunk starts.

## Phase 1: Vite+ install and hooks (NBD-110a)

1. Add `vite-plus@1.0.0` as an exact root dev dependency. Add a root `vite.config.ts` that holds
   only the `staged` block for now:
   - `*.{ts,tsx,js,mjs,cjs,json,css,md}`: the existing Prettier run (Oxfmt comes in phase 6).
2. Point the pre-commit hook at `vp staged` and keep `commit-msg` running commitlint. Keep the
   malware-scan hooks byte for byte.
3. Remove `lint-staged` and `.lintstagedrc.mjs`. Keep husky until `vp config` hook installation is
   confirmed to keep the malware hooks, then decide in review whether husky goes.
4. Test both ways: a commit from this non-interactive shell finishes, and a staged file with a
   format error is fixed by the hook. Record the result in the PR.

Risk: Vite+ has open Windows issues (PATH resolution, Defender false positives). If `vp staged`
also hangs without a terminal, fall back to a plain hook script that runs Prettier on the staged
file list, and keep Vite+ for phase 6 only.

## Phase 2: Native boundary and CI (NBD-106)

1. Move `scripts/check-native-no-sentry.mjs` into `apps/native/scripts/` and update its script.
2. Turn `spa-ci.yml` into `native-ci.yml` (native and shared lint, typecheck, test). Keep
   `native-apk.yml`.
3. Tag the current `dev` tip `legacy-reference` and push the tag.
4. **Owner step:** the required status checks on `dev` and `master` list the root and SPA jobs.
   They have to be replaced with the native jobs in the GitHub branch protection settings, or every
   later PR is blocked. Claude prepares the exact list; the owner applies it.

## Phase 3: Delete the SPA and the legacy app (NBD-107, NBD-108)

Two commits on one branch:

1. **SPA:** `apps/spa/**`, Wrangler and Cloudflare scripts, SPA CI jobs, and the SPA-only shared
   exports (`copy/landing.ts`, `constants/site.ts`, web theme values).
2. **Legacy:** `app/`, `components/`, `features/`, `lib/`, root `content/`, `types/`, `stores/`,
   `public/`, `e2e/`, root `android/`, `resources/`, `supabase/`, the Next, Sentry, Capacitor,
   Vitest and Playwright configs, `proxy.ts`, `instrumentation*.ts`, root ESLint config, the legacy
   scripts, and the root CI workflows (`build`, `lint`, `typecheck`, `test`, `e2e`,
   `colocated-test-check`). Root `package.json` keeps only workspace tooling.
3. Keep `store-assets/` until NBD-92 ships the Play listing. Move the adhkar scraper into native
   tooling only if content regeneration is still wanted; otherwise it stays in the tag.
4. Retiring the live Supabase project is a manual owner step outside the repository.

## Phase 4: Fold `packages/shared` into native (NBD-111)

Each module goes to the feature that owns it, so the feature-folder rule in `AGENTS.md`
(`logic.ts` pure, `db.ts` for SQLite) becomes literally true:

| From `packages/shared/src`        | To `apps/native/src`                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `logic/<feature>.ts`              | `<feature>/logic.ts` (`checklist` and `wird` into `wird/`, `prayer-calc` and `prayer-times` into `prayer-times/`, `notification-prefs` into `device/`) |
| `logic/day.ts`, `logic/format.ts` | `lib/day.ts`, `lib/format.ts` (cross-feature)                                                                                                          |
| `copy/<feature>.ts`               | `<feature>/copy.ts`; `copy/shell.ts` into `shell/copy.ts`; `copy/location.ts` into `device/copy.ts`                                                    |
| `types/<feature>.ts`              | `<feature>/types.ts`; `types/result.ts` into `lib/result.ts`                                                                                           |
| `content/*`                       | `content/*` (Arabic data used by several features)                                                                                                     |
| `contracts/repositories.ts`       | the owning feature's `types.ts`, or `db/contracts.ts` where several features share it                                                                  |
| `tokens/tokens.ts`                | `theme/tokens.ts`, without the web-only values                                                                                                         |
| `testing/*`                       | `testing/*`                                                                                                                                            |
| `__tests__/*` (Vitest)            | the owning feature's `__tests__/` under Jest                                                                                                           |

Chunks, each green on its own: (a) types, contracts, `lib/`; (b) content and copy; (c) logic and
its tests, converted from Vitest to Jest; (d) tokens and testing, remove `@nabd/shared` from
`package.json`, delete `packages/`, and move the shared purity lint (no I/O imports, no
`Date.now()`, no `Math.random()`) onto `apps/native/src/**/logic.ts`.

Imports are rewritten with relative paths or a single `@/` alias, decided in chunk (a) and used
everywhere after.

## Phase 5: Move to `native/` (NBD-112, absorbs NBD-109)

1. `git mv apps/native native`, then fix `pnpm-workspace.yaml`, the Metro config, EAS and CI paths,
   and the APK workflow path filters.
2. Reduce root `package.json` to the workspace tooling (Vite+, commitlint), regenerate the
   lockfile, clean `.gitignore`.
3. Verify an Expo export, the debug APK build in CI, and an EAS preview build before merging.
4. Update every doc path from `apps/native` to `native/`.

## Phase 6: Oxfmt, Oxlint, CI through `vp` (NBD-110b to NBD-110d)

1. **Oxfmt (b):** carry `.prettierrc.json` and `.prettierignore` into the Vite+ config; no Tailwind
   class sorting yet. One commit reformats the repository; its hash goes in
   `.git-blame-ignore-revs`. Switch the staged block to `vp fmt`.
2. **Oxlint (c):** one config for `native/`: `no-console`, `react/rules-of-hooks`,
   `react/exhaustive-deps`, `no-restricted-imports`, and the `logic.ts` purity rules. Oxlint has
   no built-in `no-restricted-syntax`, so the `Date.now()` and `Math.random()` ban uses the
   `oxlint-plugin-eslint` JS plugin (alpha). If that plugin fails, a ten-line custom JS rule does
   the same.
3. **Cleanup (d):** remove ESLint, Prettier, and their configs; CI runs `pnpm exec vp fmt --check`
   and `pnpm exec vp lint`, plus the unchanged `tsc`, Jest, and APK jobs.

## Risks

| Risk                                                          | Where          | Handling                                                        |
| ------------------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| `vp staged` hangs without a terminal like lint-staged did     | Phase 1        | Tested from this shell before merge; plain hook script fallback |
| Required status checks block PRs after jobs are removed       | Phases 2, 3    | Owner updates branch protection in the same session             |
| A legacy behavior is needed after deletion                    | Phase 3 onward | Read from the `legacy-reference` tag                            |
| Folding shared misses an import and breaks the release bundle | Phase 4        | Expo export and the APK workflow in every chunk                 |
| Metro or EAS paths break after the move                       | Phase 5        | Expo export, CI APK, and EAS preview build before merge         |
| Oxfmt output differs from Prettier                            | Phase 6        | Single reformat commit, blame-ignored                           |
| Oxlint JS plugins are alpha                                   | Phase 6        | Custom rule fallback                                            |
| New native binaries (Vite+, Oxc) and Defender false positives | Phases 1, 6    | Exact pins, supply-chain check in the security gate             |
