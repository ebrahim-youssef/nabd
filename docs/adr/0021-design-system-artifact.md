# ADR-0021 — Design system artifact

- **Status:** accepted
- **Date:** 2026-11-19

## Context

The previous design-system token contract and font set no longer describe the native product. The
new approved visual source is the Claude Design artifact named nabd. Licensed Thmanyah fonts are
available to the owner locally but cannot be stored in the repository.

## Decision

Use the nabd Claude Design artifact at
https://claude.ai/artifact/RkhFPns49rDaDVDgMxG4ah as the source of truth. Copy token values by hand
into the native CSS variables and Tailwind theme; do not restore the old MCP import. Use only the
five licensed Thmanyah OTF files listed by `theme/fonts.cjs`, stored locally under the ignored
`assets/fonts/thmanyah/` directory. Supersede ADR-0007.

## Consequences

- `theme/tokens.ts`, `global.css`, and `theme/tailwind-theme.cjs` must remain in token parity.
- App code uses only the new semantic color, type, radius, and shadow names.
- The licensed fonts are never committed or hosted, and release build scripts fail when they are
  absent, empty, or smaller than 1 KB.
- Revisit this decision when the artifact or font license changes.
