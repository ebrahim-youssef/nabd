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
