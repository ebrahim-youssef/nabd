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

## 2026-08-28b amendment - native first

The owner has set a single priority: **the native application reaches Google Play as soon as it
can**. The SPA and web migration is on hold. This amendment supersedes the _Order of work_ in the
2026-08-28 amendment; that amendment's status table and its four corrections stand, and everything
else above still applies where it does not conflict.

### What closed since the previous amendment

| Ticket                     | State  | Evidence                                                                             |
| -------------------------- | ------ | ------------------------------------------------------------------------------------ |
| NBD-84 SPA parity          | done   | all thirteen slices: #181-#188, sharing #189, foreground reminders #193, Sentry #194 |
| NBD-87a required gates     | done   | Playwright gate #191, plus seventeen required contexts on `dev` and `master`         |
| NBD-90 durability decision | done   | ADR-0015, accepted at #195/#198 and this amendment                                   |
| ADR-0016 native release    | done   | #197                                                                                 |
| PR #166                    | closed | superseded by NBD-86, rebuild plan recorded on the pull request                      |

Steps 1 through 3 of the previous amendment are complete. What follows replaces steps 4 through 9.

### Two new tickets

**NBD-91, durability implementation.** ADR-0015 is accepted and its trigger is now concrete: export
and import ship before **any** submission to Google Play, an internal or closed testing track
included. This is no longer post-migration work, it is the last gate before publication. Scope: the
versioned backup format and its shared serialization in `packages/shared`, and the SQLite read and
write halves in `apps/native`, covering wird versions, wird entries, qada events, settings and
cached coordinates. Import states what it is about to do before it does it, and resolves onto a
non-empty device by union on event identity, which the append-only contract makes safe. The Dexie
half is designed here and implemented when the web track resumes, so native is not blocked on
paused work.

**NBD-92, EAS build and Play release path.** ADR-0016 records that `master` produces both an AAB and
an APK through EAS and that this is not NBD-88, which is scoped to Cloudflare alone. It had no
ticket. It has one now: the EAS configuration, the upload keystore and its custody, the Play console
listing, and the `master` workflow. It is the last ticket before submission.

### Order of work

**Step 1. NBD-85, native product parity.** Thirteen slices in the same order NBD-84 used, on one
branch, in one pull request, one commit per slice. The parity-ledger section B characterization
fixture lands as the first commit, in `packages/shared`, consumed by both the SQLite and Dexie
suites. Each slice keeps the three additions the previous amendment specified, and they are worth
restating because they are what green gates do not prove:

- The NativeWind guard check. `className` is silently dropped on components NativeWind has not
  registered, `Animated.View`, `Animated.Text` and `LinearGradient` among them. Nothing warns and
  unit tests still pass, so the source is scanned for it.
- A screenshot of the rendered screen. Gates prove it compiles, not that it renders.
- That slice's fixture assertions, so persistence semantics are proven per slice rather than once at
  the end.

One feature per delegated run. A single brief covering many route groups has hung for eighty minutes
with no writes.

**Step 2. NBD-86, device integration.** Each item maps to one of the four matrices in parity-ledger
section D: exact alarms and sound, permanent countdown, location and the GPS switch, and
battery-optimization exemption. Every state gets an actionable Arabic outcome. The permission model
is ADR-0016's: `USE_EXACT_ALARM` for Android 13 and above, `SCHEDULE_EXACT_ALARM` with
`android:maxSdkVersion="32"` for Android 12, prompting through `canScheduleExactAlarms()` when it
returns false there.

**The previous amendment held this ticket's merge until NBD-88. That hold is cut.** NBD-88 is
Cloudflare release preparation for the SPA, which is on hold, so the hold would have blocked NBD-86
indefinitely.

What replaces it is a **per-ticket device check**, not the full section D matrix. The owner installs
the APK this ticket's own pull request builds and confirms the four matrices behave for the states
this ticket implements. That is what gates the merge. It is deliberately narrower than the final
pass, because the final pass cannot run before the ticket it would gate has merged, and a gate that
requires its own output is not a gate.

**Step 3. NBD-87b, the remaining native gates.** Added as native earns them: Maestro flows, a clean
`expo prebuild` with generated-manifest verification, and the focused security review. The release
APK build is already in place and stays a full release build on pull requests rather than a compile
check, because one pull request per ticket makes one build per ticket affordable.

**Step 4. NBD-89a, native verification.** Run every parity-ledger row and golden journey that native
owns, against a release APK, and collect the evidence. Fill parity-ledger section E's ownership table
first, at least for the native-owned gates: gate 2 already splits, since native proves restart
persistence and the SPA does not claim it. Run the review in a fresh session rather than one
carrying the implementation context.

The **full section D device matrix** runs here, on a release APK built from `dev` once NBD-85 and
NBD-86 have both merged. Those two are the native product and device tickets; the ordering does not
wait on NBD-91 or NBD-92, which come after this step. Each of those two then ends with a short
confirmation pass over what it actually changed on the device rather than a re-run of the whole
matrix: for NBD-91 that is a real export and restore on the phone, and for NBD-92 it is the signed
artefact installing and launching. Anything either ticket changes in a section D behaviour re-runs
that matrix row.

**Step 5. NBD-91, durability.** Export and import, as scoped above. It is the last functional gate
before the store.

**Step 6. NBD-92, EAS and Play.** Configuration, keystore custody, listing, `master` workflow,
submission.

ADR-0015 accepts option 2 alongside option 1, and option 2 lands here rather than in NBD-91: Android
application backup enabled, a restore actually verified, and the inclusion and exclusion rules
stated. It sits with the publication work because it is expressed in `apps/native/app.json` and the
generated manifest, which is also where the `android:allowBackup` choice that ADR-0015 withdrew from
the ledger gets made. Reaching the store having shipped option 1 and skipped option 2 would leave an
accepted decision undelivered.

### On hold

NBD-88 Cloudflare release preparation, the web half of NBD-89, and the SPA half of NBD-91 are
paused, not cancelled. They resume when the owner says so. Nothing in steps 1 through 6 may take a
dependency on them, and the NBD-86 hold above was the one place that already had.

Deletion of the legacy Next.js, Capacitor and legacy Android source stays deferred. ADR-0015 no
longer blocks it, but the owner's instruction is that it happens once the migration is finished, so
it is the last step of all and not a side effect of any ticket here.

### Workflow

One ticket, one branch, one pull request, one commit per slice, merged by **rebase-merge** rather
than squash so the slice commits survive. The 2026-08-28 amendment to
[ADR-0003](../adr/0003-branching-and-environments.md) records this and why.

Every pull request draws an automated review. Its comments are addressed on their merits and
resolved, never bypassed with an admin merge. That happened once, on #195, and it discarded a
correct finding about this plan's own premises which then took #198 to repair.

### What finalized means

Unchanged in substance, narrowed in order. The native migration is finished when NBD-89a passes,
NBD-91 ships and NBD-92 submits, with the legacy tree still in the repository. The web migration is
finished separately, when it resumes. Until NBD-91 ships, no screen, release note or store listing
may claim that local persistence alone protects a user's history.
