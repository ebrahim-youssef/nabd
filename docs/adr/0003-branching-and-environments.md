# ADR-0003 — Branching & environments

- **Status:** accepted
- **Date:** 2026-07-13

## Context

nabd deploys on Vercel and needs a predictable path from a feature branch to production, with
a staging step to smoke-test before users see a change.

## Decision

**feature → dev → master.** Feature branches are cut from `dev` and named
`<user>/<issue-number>-<slug>` (e.g. `ibrahim/42-checkoff-row`), where the issue number is the
**GitHub issue**. Merges are **squash-merges**; the PR title becomes the commit and must be
Conventional-Commits valid. Environments: every pushed branch → a Vercel preview URL; `dev` →
staging (auto-deploy); `master` → production (auto-deploy on merge). Before `dev → master`,
the feature is smoke-tested on the staging URL; after production deploy, the project success
check is re-run on the production URL.

Rejected: trunk-based (wanted an explicit staging gate); full GitFlow (release/hotfix branches
are heavier than needed).

## Consequences

- Tickets live in `docs/backlog.md` as `NBD-N` planning IDs and map to GitHub issues; branches
  and commits reference the GitHub issue number.
- Two required promotions (feature→dev, dev→master), each gated by CI and a manual browser
  check.
- Production is never reached without passing staging first.
- Revisit if the team grows and staging contention becomes a bottleneck.
