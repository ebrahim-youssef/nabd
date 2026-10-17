# ADR-0007 — Design system source (Claude Design)

- **Status:** accepted
- **Status note:** Its web token import and CSS mapping are superseded by
  [ADR-0017](./0017-native-only.md) for the native product; the design source remains historical.
- **Date:** 2026-07-13

## Context

nabd has an existing design system authored in **Claude Design**, rather than a brand kit to
transcribe or an AI-generated palette to invent. We needed to decide how the repo's visual
tokens relate to that external system, and avoid fabricating substitute values that would
later contradict it.

## Decision

The **Claude Design project is the source of truth** for the palette, fonts, and scales:
`https://claude.ai/design/p/e42ff72c-8bbf-45a9-9481-a8f8acbbd452`. Tokens are **imported** into
the repo via the `claude_design` MCP (`/design-login`, which requires an interactive terminal)
and materialized as CSS variables under Tailwind `@theme` — this is ticket **NBD-3**.
`DESIGN_SYSTEM.md` defines the **token contract** (the semantic token names and the fixed
rules: light+dark, multiple faces one-per-context, RTL-first, AA contrast, tokens-only in
components); NBD-3 fills in the concrete values from the design project. **No UI ticket starts
before NBD-3 lands the real tokens**, and no substitute colors/fonts are invented in the
meantime.

Rejected: AI-generating a palette via the design playbook (a real design system already
exists); hardcoding placeholder hex values now (they would contradict the imported system and
mislead anyone building against them).

## Consequences

- NBD-3 is a prerequisite for every visual/UI ticket.
- Components consume semantic tokens only; raw hex/font literals are banned (lint + review).
- Theming (light+dark), the three type contexts (Quran/adhkar, headings, UI), radii, spacing,
  and elevation all resolve from the imported values.
- Revisit if the design moves off Claude Design (the import step would change, not the token
  contract).
