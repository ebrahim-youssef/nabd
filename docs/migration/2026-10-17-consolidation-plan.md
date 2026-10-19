# Consolidation plan: the native app at the repository root, Vite+ tooling

- **Date:** 2026-10-17
- **Decision record:** [ADR-0017](../adr/0017-native-only.md), amended 2026-10-17
- **Tickets:** NBD-98 to NBD-112 in [`docs/backlog.md`](../backlog.md) R12

## Goal

At the end, the repository root is the Expo app. `package.json`, `app/`, `src/`, `android/`,
`modules/`, `plugins/`, `theme/`, `assets/`, `app.json` and `eas.json` sit at the top level, next to
`docs/`, `.github/` and the Git hooks. There is no `apps/`, no `packages/`, no `native/` folder, no
pnpm workspace, and no web code. All product code (routes, features, pure logic, Arabic content,
copy, theme, device code, the Kotlin module, config plugins, tests) lives in that one app.

The developer toolchain is Vite+ (`vp`): Oxfmt formats, Oxlint lints, `vp staged` runs the
pre-commit checks. Metro, Jest with `jest-expo`, `tsc --noEmit`, EAS and Gradle stay, because Expo
supports only those for React Native.

## Decisions taken in this plan

1. **The root Next.js app stays in the tree, building, until native has every feature.** It is
   deleted only after the parity tickets (NBD-98 to NBD-105, NBD-91) are done and NBD-89a passes on
   a release APK. Before deletion, its last commit is tagged `legacy-reference` so it stays easy to
   open later.
2. **New code goes into `apps/native` only.** Parity work never adds to the root app or to
   `packages/shared`; new pure logic goes straight into `apps/native/src/<feature>/logic.ts`. That
   keeps the later fold-in small.
3. **`packages/shared` is folded into the native app after the Next.js app is gone.** The root app
   imports `@nabd/shared` (for example `features/stats/logic.ts`), so folding it earlier would break
   the reference app. Pure logic keeps its purity through a lint rule on `logic.ts` files instead of
   a package boundary.
4. **The native app is lifted to the repository root as the last structural step.** The pnpm
   workspace goes away and the root tooling (Vite+, commitlint) merges into the app's
   `package.json`.
5. **Vite+ is installed as a pinned local dev dependency** (`vite-plus@1.0.0`, released
   2026-09-28, the newest release at least two weeks old). No global installer script.
6. **Kept as they are:** Jest and `jest-expo` for native tests, `tsc --noEmit`, commitlint, the
   malware-scan hooks (`pre-push`, `post-checkout`, `post-merge`, `post-rewrite`), the APK
   workflow, EAS profiles.

## Order and why

The hook fix comes first because the pre-commit hook currently hangs. The SPA is deleted early
because nothing depends on it and it is not a reference. Parity comes next, while the Next.js app
can still be run side by side for comparison. The Next.js app, the shared package and the
workspace layout are removed only after that. Oxlint and Oxfmt come last, once there is one app and
one config to write.

| Phase | Ticket                    | Size | What                                        | Done when                                                                                       |
| ----- | ------------------------- | ---- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1     | NBD-110a                  | S    | Vite+ install and hooks                     | `vp staged` replaces lint-staged; a commit from a non-interactive shell finishes                |
| 2     | NBD-106                   | S    | Native boundary and CI                      | Native CI runs from native-owned scripts                                                        |
| 3     | NBD-107                   | M    | Delete the SPA                              | `apps/spa`, Cloudflare config, SPA CI jobs and SPA-only shared exports are gone; gates green    |
| 4     | NBD-98 to NBD-105, NBD-91 | L    | Parity features                             | Each ticket's acceptance criterion in the backlog                                               |
| 5     | NBD-89a                   | M    | Release APK and owner device verification   | Every parity-ledger row and the section D device matrix pass on a release APK                   |
| 6     | NBD-108                   | M    | Delete the Next.js app, Capacitor, Supabase | `legacy-reference` tag pushed; only `apps/native` and `packages/shared` remain as code          |
| 7     | NBD-111                   | L    | Fold `packages/shared` into the native app  | No `@nabd/shared` import remains; `packages/` is gone; former shared tests run under Jest       |
| 8     | NBD-112                   | M    | Lift the native app to the repository root  | No `apps/` folder or workspace; Expo export, CI APK and an EAS preview build pass from the root |
| 9     | NBD-110b to NBD-110d      | M    | Oxfmt, Oxlint, CI through `vp`              | ESLint and Prettier removed; one reformat commit in `.git-blame-ignore-revs`                    |
| 10    | NBD-92                    | M    | EAS build and Play release                  | As listed in the backlog                                                                        |

Every phase is one branch and one PR into `dev`, merged with a normal merge commit. Each chunk is
built by a runner test-first, reviewed, and gated (`lint`, `typecheck`, `test`, Expo export) before
the next chunk starts.

## Phase 1: Vite+ install and hooks (NBD-110a)

1. Add `vite-plus@1.0.0` as an exact root dev dependency. Add a root `vite.config.ts` that holds
   only the `staged` block for now: `*.{ts,tsx,js,mjs,cjs,json,css,md}` runs the existing Prettier
   (Oxfmt comes in phase 9), and `*.{ts,tsx}` keeps the existing ESLint fix.
2. Point the pre-commit hook at `vp staged` and keep `commit-msg` running commitlint. Keep the
   malware-scan hooks byte for byte.
3. Remove `lint-staged` and `.lintstagedrc.mjs`. Keep husky until `vp config` hook installation is
   confirmed to keep the malware hooks, then decide in review whether husky goes.
4. Test both ways: a commit from this non-interactive shell finishes, and a staged file with a
   format error is fixed by the hook. Record the result in the PR.

Risk: Vite+ has open Windows issues (PATH resolution, Defender false positives). If `vp staged`
also hangs without a terminal, fall back to a plain hook script that runs Prettier on the staged
file list, and keep Vite+ for phase 9 only.

## Phase 2: Native boundary and CI (NBD-106)

1. Move `scripts/check-native-no-sentry.mjs` into `apps/native/scripts/` and update its script.
2. Turn the native and shared jobs in `spa-ci.yml` into `native-ci.yml`. The SPA jobs stay in
   `spa-ci.yml` until phase 3 removes them. Keep `native-apk.yml` and the root CI workflows.

## Phase 3: Delete the SPA (NBD-107)

1. Delete `apps/spa/**`, the Wrangler and Cloudflare scripts, `spa-ci.yml`, and the SPA-only shared
   exports (`copy/landing.ts`, `constants/site.ts`, web theme values) after checking that the root
   app does not import them.
2. **Owner step:** the required status checks on `dev` and `master` list the SPA jobs. They have to
   be removed in the GitHub branch protection settings, or every later PR is blocked. Claude
   prepares the exact list; the owner applies it. The same step repeats in phase 6 for the root
   jobs.

## Phase 4 and 5: Parity and verification

The parity tickets run in the order the backlog lists them, each test-first, each comparing
against the running Next.js app. New pure logic, copy and types go into the native feature folder,
not into `packages/shared`. NBD-89a closes the phase: a release APK passes every parity-ledger row
and the owner's device matrix.

## Phase 6: Delete the Next.js app (NBD-108)

1. Tag the last commit that contains the app `legacy-reference` and push the tag.
2. Delete `app/`, `components/`, `features/`, `lib/`, root `content/`, `types/`, `stores/`,
   `public/`, `e2e/`, root `android/`, `resources/`, `supabase/`, the Next, Sentry, Capacitor,
   Vitest and Playwright configs, `proxy.ts`, `instrumentation*.ts`, the root ESLint config, the
   legacy scripts, and the root CI workflows (`build`, `lint`, `typecheck`, `test`, `e2e`,
   `colocated-test-check`). Root `package.json` keeps only workspace tooling.
3. Keep `store-assets/` until NBD-92 ships the Play listing. Move the adhkar scraper into native
   tooling only if content regeneration is still wanted; otherwise it stays in the tag.
4. Retiring the live Supabase project is a manual owner step outside the repository.

NBD-108 was completed on 2026-10-19; the `legacy-reference` tag points at `abdad09`.

## Phase 7: Fold `packages/shared` into the native app (NBD-111)

Done on 2026-10-19.

Each module goes to the feature that owns it, so the feature-folder rule in `AGENTS.md`
(`logic.ts` pure, `db.ts` for SQLite) becomes literally true. Paths below are inside
`apps/native/src`; phase 8 then lifts them to `src/` at the root.

| From `packages/shared/src`        | To                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `logic/<feature>.ts`              | `<feature>/logic.ts` (`checklist` and `wird` into `wird/`, `prayer-calc` and `prayer-times` into `prayer-times/`, `notification-prefs` into `device/`) |
| `logic/day.ts`, `logic/format.ts` | `lib/day.ts`, `lib/format.ts` (cross-feature)                                                                                                          |
| `copy/<feature>.ts`               | `<feature>/copy.ts`; `copy/shell.ts` into `shell/copy.ts`; `copy/location.ts` into `device/copy.ts`                                                    |
| `types/<feature>.ts`              | `<feature>/types.ts`; `types/result.ts` into `lib/result.ts`                                                                                           |
| `content/*`                       | `content/*` (Arabic data used by several features)                                                                                                     |
| `contracts/repositories.ts`       | the owning feature's `types.ts`, or `db/contracts.ts` where several features share it                                                                  |
| `tokens/tokens.ts`                | `theme/tokens.ts` (outside `src/`), without the web-only values                                                                                        |
| `testing/*`                       | `testing/*`                                                                                                                                            |
| `__tests__/*` (Vitest)            | the owning feature's `__tests__/` under Jest                                                                                                           |

Chunks, each green on its own: (a) types, contracts, `lib/`; (b) content and copy; (c) logic and
its tests, converted from Vitest to Jest; (d) tokens and testing, remove `@nabd/shared` from
`package.json`, delete `packages/`, and move the shared purity lint (no I/O imports, no
`Date.now()`, no `Math.random()`) onto `src/**/logic.ts`.

Imports use one `@/` alias for `src/`, set up in chunk (a) and used everywhere after, so phase 8
does not have to rewrite them.

## Phase 8: Lift the native app to the repository root (NBD-112, absorbs NBD-109)

1. `git mv` every tracked file under `apps/native/` to the same path at the root, then delete
   `apps/`. Nothing collides by then: the Next.js `app/`, `android/`, `scripts/` and configs were
   deleted in phase 6.
2. Merge the remaining root tooling (Vite+, commitlint, `prepare`) into the app's `package.json`,
   delete `pnpm-workspace.yaml`, and regenerate the lockfile from a clean install.
3. Fix every path that assumed the workspace: Metro `watchFolders` and resolver, the Jest and Babel
   configs, `tsconfig.json`, EAS, the Gradle project paths, CI working directories, and the APK
   workflow path filters.
4. Verify an Expo export, the release APK build in CI, and an EAS preview build before merging.
5. Update every doc path from `apps/native/` to the root.

## Phase 9: Oxfmt, Oxlint, CI through `vp` (NBD-110b to NBD-110d)

1. **Oxfmt (b):** carry `.prettierrc.json` and `.prettierignore` into the Vite+ config; no Tailwind
   class sorting yet. One commit reformats the repository; its hash goes in
   `.git-blame-ignore-revs`. Switch the staged block to `vp fmt`.
2. **Oxlint (c):** one config for the app: `no-console`, `react/rules-of-hooks`,
   `react/exhaustive-deps`, `no-restricted-imports`, and the `logic.ts` purity rules. Oxlint has no
   built-in `no-restricted-syntax`, so the `Date.now()` and `Math.random()` ban uses the
   `oxlint-plugin-eslint` JS plugin (alpha). If that plugin fails, a ten-line custom JS rule does
   the same.
3. **Cleanup (d):** remove ESLint, Prettier, and their configs; CI runs `pnpm exec vp fmt --check`
   and `pnpm exec vp lint`, plus the unchanged `tsc`, Jest, and APK jobs.

## Risks

| Risk                                                            | Where       | Handling                                                        |
| --------------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| `vp staged` hangs without a terminal like lint-staged did       | Phase 1     | Tested from this shell before merge; plain hook script fallback |
| Required status checks block PRs after jobs are removed         | Phases 3, 6 | Owner updates branch protection in the same session             |
| Parity work adds to `packages/shared` and grows the fold-in     | Phases 4, 5 | Brief rule: new code goes into `apps/native` only               |
| A legacy behavior is needed after deletion                      | Phase 6 on  | Read from the `legacy-reference` tag                            |
| Folding shared misses an import and breaks the release bundle   | Phase 7     | Expo export and the APK workflow in every chunk                 |
| Metro, Gradle or EAS paths break when the app moves to the root | Phase 8     | Expo export, CI APK, and EAS preview build before merge         |
| Oxfmt output differs from Prettier                              | Phase 9     | Single reformat commit, blame-ignored                           |
| Oxlint JS plugins are alpha                                     | Phase 9     | Custom rule fallback                                            |
| New native binaries (Vite+, Oxc) and Defender false positives   | Phases 1, 9 | Exact pins, supply-chain check in the security gate             |
