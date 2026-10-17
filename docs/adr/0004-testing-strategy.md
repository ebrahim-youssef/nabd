# ADR-0004 — Testing strategy

- **Status:** accepted
- **Status note:** Its web and Supabase test clients are superseded by
  [ADR-0017](./0017-native-only.md); colocated tests and gate discipline remain.
- **Date:** 2026-07-13

## Context

nabd's correctness risk is concentrated in offline persistence, sync, and statistics that must
survive changes to the wird definition. We needed a testing approach that catches those
without a coverage-number theater.

## Decision

**Colocated tests, shipped in the same PR**, CI-enforced: a PR touching a feature's `logic.ts`
or `db.ts` without a test file in the diff cannot merge. Per-layer matrix:

| Layer                  | Runner                           | Style                                                                                                  |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `logic.ts` (pure)      | Vitest (node)                    | table-driven, zero mocks; **property-based** for combinatorial logic (esp. stats across wird versions) |
| `db.ts` (repositories) | Vitest + `fake-indexeddb`        | one test per method; empty/duplicate/concurrent edge cases                                             |
| components             | Vitest (jsdom) + Testing Library | interaction, not visual                                                                                |
| flows                  | Playwright (Chromium)            | full flow; offline path when applicable                                                                |

**Mandatory e2e paths** (always tested when touched): offline persistence (check off → offline
→ reload → still checked, zero network requests); sync → stats; dhikr counter completion →
linked wird item auto-marked. **No numeric coverage gate** — colocation + review is the bar.

Rejected: tests as follow-up tasks (becomes a backlog that never shrinks); Vitest-only without
e2e (offline/sync behavior is only real in a browser); a coverage percentage gate (rewards
gaming over meaningful tests).

## Consequences

- Property-based tests guard the key invariant: changing the wird never rewrites past
  statistics.
- CI includes a `colocated-test-check`; the offline persistence e2e is a permanent guard for
  the app's whole premise.
- Reviewers judge test quality directly rather than leaning on a coverage number.
- Revisit if flaky e2e slows delivery (would tighten scope, not drop the offline path).
