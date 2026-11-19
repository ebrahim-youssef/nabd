# ADR-0022 — Accepted limit: sheet save errors after the sheet closes

- **Status:** accepted
- **Date:** 2026-11-19

## Context

The third review round of the P4 redesign PR (#289) found that a Home sheet's failed-save toast is
lost when the user closes the sheet before the write finishes. The review stop rule moves remaining
non-security P2 findings to a follow-up after three rounds.

## Decision

Ship P4 with this limit and fix it in #290 (route the late result to Home's root-level toast).
Rejected: a fourth review round on P4 for a case that needs a close during a pending write that
then fails.

## Consequences

No data is lost: the item stays unrecorded and visible on Home and Today, so the user can tick it
again. Revisit if write failures turn out to be common on devices.
