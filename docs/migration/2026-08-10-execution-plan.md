# Migration execution plan - 2026-08-10

This plan supersedes the PR 0-3 delivery grouping in
`docs/superpowers/plans/2026-08-09-migration-execution-brief.md`. The older brief remains in
history as the record that led to this smaller ticket sequence.

Sources of truth:

- `docs/adr/0014-spa-native-split.md`, including its 2026-08-10 amendment
- `docs/migration/parity-ledger.md`
- `docs/superpowers/plans/2026-08-05-nextjs-to-spa-native-migration.md`
- GitHub umbrella issue #167 and child issues #168 through #176

## Confirmed scope

- Web: Vite and React Router in `apps/spa`, prepared for Cloudflare.
- Native: Android Expo with config plugins and `expo-sqlite`, delivered as an APK.
- Shared: platform-neutral logic, types, design tokens, Arabic copy, and content in
  `packages/shared`.
- Presentation: strict behavioral and visual parity with the reference app. No redesign is part
  of this migration.
- Web runtime: no PWA, service worker, installability, or offline guarantee.
- Native runtime: offline operation is required.
- Accounts: Supabase authentication and sync are not carried into the replacement clients.
- Data: replacement clients start with fresh local state; no legacy-data migration is included.
- Observability: Sentry remains in both replacement clients.
- Hosting: the SPA build and runbook target Cloudflare. The migration does not deploy or move the
  production domain. Vercel files, workflows, Analytics, and deployment documentation are removed
  before completion.
- Retirement: the old Next.js and Capacitor source stays as a rollback reference after cutover.
  Deleting it requires a later explicit owner decision.
- Device acceptance: device-feature code may be completed in the integration stack, but it does
  not merge until the complete APK is ready and the owner verifies the full device matrix.

## Delivery rules

Each ticket follows `docs/workflow.md` independently:

1. Confirm its issue and acceptance criteria.
2. Branch from current `dev`.
3. Plan in dependency order: content/types, pure logic, repositories, hooks, components, routes.
4. Fetch current library documentation before using framework or device APIs.
5. Add colocated tests with the implementation.
6. Run all relevant local gates and live browser or emulator checks.
7. Review the complete diff, including the required focused security pass.
8. Commit and push specific files only.
9. Open a PR into `dev`; merge only after required CI and manual gates pass.

No delegate commits, pushes, rebases, changes branches, or merges. The orchestrator reviews every
delegate diff and runs the gates itself.

## Ticket sequence

### NBD-80 / issue #167 - baseline and documentation

Scope:

- Reconcile migration PRs #161 through #166 without importing unrelated formatting churn.
- Protect all real environment files while retaining committed examples.
- Record the code-backed parity and architecture decisions.
- Mark the real completion status of migration phases.
- Link the issue chain and release boundary.

Acceptance: the accepted decisions, current parity, phase status, and release path are recorded,
and the selected integration baseline passes its existing gates.

### NBD-81 / issue #168 - canonical shared domain

Dependency: NBD-80.

Port and deduplicate in this order:

1. Domain and result types.
2. Arabic copy and static content.
3. Day and numeral formatting.
4. Wird versions, schedules, and optional-item rules.
5. Checklist and today-summary derivation.
6. Counter completion and checklist linking.
7. Statistics and per-item history calculations.
8. Qada calculations.
9. Prayer-time and notification payload calculations.
10. Platform-neutral repository contracts.

Acceptance: legacy, SPA, and native compile against one tested canonical implementation, with no
platform I/O in shared logic.

### NBD-82 / issue #169 - native onboarding and SQLite slice

Dependency: NBD-81.

Scope:

- Replace the diagnostic entry route with the production navigation shell.
- Port the onboarding introduction, questionnaire, and three levels without changing the design.
- Establish versioned SQLite migrations and the initial product schema.
- Persist onboarding answers, active level, and initial wird version.
- Restore the same state after process death and restart.
- Keep diagnostics development-only if they remain useful.

Acceptance: Android onboarding persists the selected level through a complete app restart.

### NBD-83 / issue #170 - SPA shell and Cloudflare foundation

Dependency: NBD-81.

Scope:

- Keep `/` as the public landing page.
- Add the RTL application shell under `/app/*`.
- Port navigation, headers, theme initialization, loading states, and error boundaries without
  design changes.
- Configure Cloudflare Wrangler and SPA history fallback.
- Add local preview and production build commands.
- Keep every `/app/*` route out of search indexing.

Acceptance: the Cloudflare production build serves `/` and direct `/app/*` requests correctly,
while only the landing page is indexable.

### NBD-84 / issue #171 - SPA parity

Dependency: NBD-83.

Port in vertical slices:

1. Onboarding.
2. Daily wird and today summary.
3. Completion celebration.
4. Dhikr counters and checklist linking.
5. Adhkar flows.
6. Intentions.
7. Prayer times and browser location.
8. Statistics and per-item drill-down.
9. Qada ledger.
10. Settings and appearance.
11. Sharing and export.
12. Best-effort foreground browser notifications.
13. Sentry and final landing SEO.

Acceptance: every web capability assigned by ADR-0014 works under `/app/*` with the reference
behavior and appearance.

### NBD-85 / issue #172 - native data and product parity

Dependencies: NBD-81 and NBD-82.

Scope:

- Implement product SQLite tables, indexes, and repositories.
- Port all product screens in the same vertical-slice order as the SPA.
- Preserve the append-only and versioned domain contracts.
- Make every product flow work without a network.
- Restore state after process death.

Acceptance: every native product workflow works offline and survives process death using SQLite.

### NBD-86 / issue #173 - native device integration

Dependency: NBD-85. Merge is held until NBD-88.

Cover the complete state matrix for:

- Location permission and device GPS state.
- Reverse geocoding and cached location.
- Notification permission.
- Exact alarms and sound channels.
- Silent and vibrate behavior, without claiming DND override.
- Morning and evening reminders.
- Permanent countdown notification.
- Reboot rescheduling.
- Battery-optimization exemption.
- Haptics, status bar, safe areas, back button, keyboard, and splash lifecycle.
- Foreground, background, killed, rebooted, offline, and supported Android API states.

Acceptance: every state has an actionable Arabic outcome and the complete APK is ready for owner
verification.

### NBD-87 / issue #174 - replacement CI

Dependencies: NBD-82 through NBD-86.

Required PR gates:

- Shared lint, typecheck, and unit tests.
- SPA lint, typecheck, unit/component tests, build, and Playwright.
- Native lint, typecheck, Jest/RN Testing Library tests, and Maestro flows.
- Clean Expo prebuild and generated-manifest verification.
- Release APK build on relevant pull requests.
- Colocated-test and shared-code duplication checks.
- Cloudflare production build.
- Focused security review.

Acceptance: every replacement-client quality gate runs and passes on pull requests.

### NBD-88 / issue #175 - Cloudflare release preparation

Dependencies: NBD-84 and NBD-87.

Scope:

- Verify the production Cloudflare build and local preview.
- Add the deployment configuration, command, required-variable inventory, and owner runbook.
- Document post-deploy smoke checks and rollback without executing the deployment.
- Remove every Vercel workflow, configuration file, Analytics integration, and deployment reference.
- Confirm Sentry remains configured for both replacement clients.

Acceptance: the SPA is ready for an owner-operated Cloudflare deployment, the build and runbook are
verified, and no Vercel integration or related file remains.

### NBD-89 / issue #176 - final verification

Dependencies: NBD-84 through NBD-88.

Scope:

- Run the full parity ledger in a real browser and Android build.
- Run automated unit, component, Playwright, Maestro, build, and security gates.
- Produce the release APK.
- Hand the APK to the owner for the complete real-device state matrix only after every migration
  code and configuration ticket is complete.
- Collect the verified Cloudflare build, deployment runbook, Sentry, and migration-report evidence.
- List Supabase, Play Store submission, iOS, and legacy deletion as deferred.

Acceptance: all automated gates and the owner device matrix pass after all migration work is
complete, and the SPA and APK are production-ready.

## Verification evidence

Production-ready is not inferred from source presence or green unit tests. NBD-89 must attach or
link evidence for every parity-ledger row, every required gate, the Cloudflare production build,
the release APK, and the owner device matrix. Missing or indirect evidence keeps the corresponding
item open.

## Explicitly deferred

- Supabase authentication and cross-device sync in replacement clients.
- Migration of local data from the legacy app.
- Google Analytics.
- iOS.
- Play Store publication and signed AAB.
- Deletion of the Next.js, Capacitor, and legacy Android source.

## 2026-08-28 amendment - finalization sequence

The ticket sequence above stands. This amendment records where the work actually is, corrects four
defects in that sequence, and fixes the order of the remaining steps. It is the current execution
contract; where it disagrees with the sections above, this amendment wins.

### Status at this amendment

| Ticket                    | State                | Evidence                                                                                                                                                                                  |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NBD-80 baseline docs      | done                 | `0e3e685`                                                                                                                                                                                 |
| NBD-81 shared domain      | done                 | #178                                                                                                                                                                                      |
| NBD-82 native onboarding  | done                 | #179                                                                                                                                                                                      |
| NBD-83 SPA shell          | done                 | #180                                                                                                                                                                                      |
| NBD-84 SPA parity         | 10 of 13 slices done | #181 onboarding, #182 wird and celebration, #183 counters, #184 adhkar and libraries, #185 prayer times, #186 stats, #187 qada, #188 settings; intentions landed with the libraries slice |
| NBD-84 slice 11 sharing   | in flight, unpushed  | branch `ibrahim/171-spa-sharing`, six files, 114 SPA unit tests green, `e2e/sharing.spec.ts` not yet run                                                                                  |
| NBD-85 native product     | not started          | `apps/native/src` holds only `db`, `observability`, `onboarding`                                                                                                                          |
| NBD-86 device integration | not started          | PR #166 is an unrelated earlier attempt, see housekeeping below                                                                                                                           |
| NBD-87 replacement CI     | not started          | `spa-ci.yml` runs shared, SPA and native lint/typecheck/test plus the Cloudflare build, but is not required and runs no Playwright                                                        |
| NBD-88 Cloudflare release | not started          | Vercel workflows and configuration still present                                                                                                                                          |
| NBD-89 final verification | not started          |                                                                                                                                                                                           |

NBD-85 is roughly four fifths of the remaining work. Everything else is small next to it, so native
starts now and runs alongside the last SPA slices rather than after them.

### Corrections to the sequence above

**1. The durability decision has no ticket.** Parity-ledger section F is an open owner decision, it
blocks deleting the legacy application, and it appears in none of NBD-80 through NBD-89. It becomes
**NBD-90**: an ADR choosing among the four recorded options, then implementing what it chooses.
Timing matters. Option 1 is a complete export and import with a versioned backup format, and the SPA
already has a partial export (`apps/spa/src/stats/useStatsExport.ts`, `apps/spa/src/download.ts`)
with no import path. Decide NBD-90 before slice 11 closes or that surface gets rebuilt later.

**2. NBD-87 is sequenced last and must land incrementally.** As written, no replacement gate is
required until after NBD-86, so all thirteen native slices would merge with native gates unenforced.
Split it into NBD-87a, required now, and NBD-87b, added per capability as native gains it. The
sequence above also missed a live gap: the SPA has eleven Playwright specs and none of them run in
CI. `spa-ci.yml` has no e2e job, and `e2e.yml` runs the legacy root suite.

**3. The required characterization fixture was never added.** Parity-ledger section B specifies a
five-part fixture with six proof obligations, due in the first persistence implementation PR. It does
not exist in `packages/shared`, `apps/spa`, or `apps/native`. It moves to a prerequisite of NBD-85,
which is where "representable in both persistence engines" is finally testable. It lives in
`packages/shared` and is consumed by both the Dexie and the SQLite test suites.

**4. Golden-journey ownership is unassigned.** Parity-ledger section E lists twelve gates that each
need an owning target, and gate 2 already splits, since native proves restart persistence and the SPA
does not claim it. Fill that assignment table before NBD-89 rather than during it. Gate 12 is the one
to check first: the SPA covers the libraries hub in `e2e/libraries.spec.ts` but has no intentions
spec, while the ledger cites both.

### Order of work

**Step 1. Close NBD-84.** Slice 11 is sharing only, since the export half already shipped with stats.
Then slice 12, best-effort foreground browser notifications, and slice 13, `@sentry/react` for the SPA
plus the final landing SEO pass. Native already has `@sentry/react-native`.

**Step 2. NBD-90, the durability ADR.** Owner decision, runs in parallel with step 1, and gates the
close of slice 11 if the chosen option touches export and import.

**Step 3. NBD-87a, the gates that can be required today.** Shared and SPA lint, typecheck, unit tests,
Cloudflare build, plus a new Playwright job for the SPA suite. Native lint, typecheck and Jest join
here because they already pass. Make these the required checks on pull requests into `dev` and
`master`, and stop requiring the legacy root workflows for changes confined to `apps/*` and
`packages/shared`.

**Step 4. NBD-85, native product parity.** Thirteen slices in the same order NBD-84 used, one issue and
one PR each, with the section B fixture landing first. One feature per delegated run: a single large
brief covering many route groups has hung for eighty minutes with no writes. Each native slice adds
three things to its definition of done beyond the standard gates:

- The NativeWind guard test. `className` is silently dropped on components NativeWind has not
  registered, including `Animated.View`, `Animated.Text` and `LinearGradient`. Nothing warns, and unit
  tests still pass. Scan the source for it.
- A screenshot of the rendered screen. Green gates prove it compiles, not that it renders.
- Its slice of the fixture assertions, so persistence semantics are proven per slice rather than once
  at the end.

**Step 5. NBD-86, device integration.** Map each item to the four matrices in parity-ledger section D:
exact alarms and sound, permanent countdown, location and the GPS switch, and battery-optimization
exemption. Every state gets an actionable Arabic outcome. Code may complete here, but merge is held
until NBD-88 and the owner's real-device pass.

**Step 6. NBD-87b.** Add each remaining gate as native earns it: Maestro flows, clean Expo prebuild and
generated-manifest verification, release APK build, and the focused security review.

**Step 7. NBD-88, Cloudflare release preparation.** The Vercel retirement half has no real dependency
and can start during step 4. The build and runbook half needs NBD-84 closed. When wiring the deploy
check, note that `wrangler deploy --dry-run` prints its marker in about a second and then lingers for
roughly twenty two minutes before exiting, so drive it as a child process and succeed on the marker.

**Step 8. NBD-89, final verification.** Run the full ledger in a real browser and a release APK, collect
evidence for every row and gate, and hand the APK to the owner for the device matrix only after every
code and configuration ticket is complete. Run the final review in a fresh session rather than one
carrying the implementation context.

**Step 9. Housekeeping, any time.** Issues #167 through #170 are merged and still open, so close them.
PR #166, open since 10 August against `dev`, predates this plan and overlaps NBD-86: either rebase it
into the NBD-86 work or close it, because NBD-86 will otherwise duplicate it.

### What finalized means

The migration is finalized when NBD-89 passes with the legacy Next.js and Capacitor source still in the
tree. Deletion stays deferred, and NBD-90 is what unblocks it later. Until NBD-90 is recorded, no
implementation may claim that local persistence alone protects multi-year devotional history.
