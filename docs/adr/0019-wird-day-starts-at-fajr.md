# ADR-0019 - Wird day starts at Fajr

- **Status:** accepted
- **Date:** 2026-11-18

## Context

Until 1.0.0 every "today" in the app was the calendar day at local midnight. A wird does not follow
the calendar: the night prayers, witr and the night adhkar after midnight belong to the day that
began at the previous Fajr. Ticking witr at 01:00 landed on the next day and left the real day
looking incomplete. The 1.1.0 redesign (NBD-115, issue #284) needs one rule for which day a moment
belongs to.

## Decision

A wird day runs from one Fajr to the next. A moment before that day's Fajr belongs to the previous
wird day. The day is named by the calendar date on which its Fajr falls.

- Fajr is computed with device local time and the saved location, the same calculation prayer
  times already use. There is no separate travel or timezone model in this release.
- The saved location is the last location fix the app already keeps in preferences, so prayer
  times can always be computed from it, also offline. No separate prayer-times cache is kept.
- When Fajr or Isha cannot be computed (high latitude) the day plan falls back to the no-times
  layout. When there is no saved location at all, the boundary is local midnight and Home shows the
  no-location state.
- Every "today" lookup goes through one wird-day resolver. Stored days are not rewritten: entries
  recorded before 1.1.0 keep the calendar day they were saved under.

Rejected: keeping local midnight (wrong day for the night acts); a fixed cut-off hour such as 03:00
(wrong whenever Fajr moves through the year); rewriting history to the new boundary (changes
records the user already saw, with no way to tell which were meant for which day).

## Consequences

The resolver is pure logic and is tested at every boundary: just before and after Fajr, midnight,
a DST change, Friday, no location, the cache fallback and invalid high-latitude times. Around the
upgrade, entries made after midnight but before Fajr on the last 1.0.0 day may sit on the calendar
day; that is accepted. Revisit if travel across timezones or a per-user cut-off is requested.
