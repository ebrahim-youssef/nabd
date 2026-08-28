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

## 2026-08-28 amendment — one ticket, one branch, one PR

The branch and environment model above is unchanged. What changes is the merge method, because
squashing destroys something the owner wants kept.

A branch tracks a **ticket**, not a slice. A ticket that decomposes into slices — NBD-84 ran to
thirteen, NBD-85 will too — keeps every slice as its own commit on that one branch, and the whole
ticket merges to `dev` in a single pull request. Each slice commit is Conventional-Commits valid
on its own; the `commit-msg` husky hook already enforces that at the moment each commit is
written, so nothing new is needed to guarantee it.

That makes **rebase-merge** the method for any pull request carrying more than one commit. Squash
would collapse the slices into a single commit and lose the per-slice history, which is the whole
point of keeping them. Rebase-merge preserves each commit and still satisfies the
`required_linear_history` protection on `dev` and `master`. A pull request that genuinely carries
one commit may still squash; the outcome is identical either way.

The practical effect on CI is the reason this was worth deciding rather than drifting into. A
thirteen-slice ticket now runs the full gate set once, on one pull request, instead of thirteen
times. That is what makes it affordable to keep the release APK build on pull requests rather than
downgrading it to a compile check.

Consequences:

- The pull request title is no longer the commit message, since there is no squash commit. It
  names the ticket. The commit messages are the slice messages, already written.
- Review is of the whole ticket. A slice is not separately reviewable, so a slice that turns out
  to be wrong is fixed by another commit on the same branch, not by a separate pull request.
- A ticket branch lives longer than a slice branch did. It still rebases onto `dev` rather than
  merging `dev` into itself, because linear history is required.
