# Architecture reassessment, 2026-08-09

Status: open. This memo does not decide anything. It records that two of the facts ADR-0014
reasoned from are wrong, sets out the three architectures now on the table, and proposes one
cheap experiment that settles the choice with evidence instead of argument.

Owner decision required before the SPA's `/app/*` routes are built.

## Why this was reopened

The owner asked for a reassessment of whether the planned four-PR migration is the right fit for
the goal. The review was done twice, independently, and both passes landed on the same place: the
delivery units are too large, and the architecture rests on a factual error.

## Two facts ADR-0014 got wrong about this repository

### 1. There is no Radix/shadcn UI to protect

ADR-0014 rejects a unified React Native Web codebase primarily on this ground:

> it would discard the already-shipped, actively-maintained Radix/shadcn web UI (Radix/shadcn
> cannot render in an RN/RNW tree, so unifying means rebuilding the web UI from RN primitives
> too, permanently trading away that ecosystem's accessibility/interaction maintenance for
> hand-rolled equivalents)

That asset does not exist.

| Claim                                   | Reality                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Actively-maintained Radix/shadcn web UI | `components/ui/` contains one file, `button.tsx`                                                          |
| Radix accessibility primitives in use   | Zero `@radix-ui/*` imports anywhere in `app/`, `components/`, `features/`, `lib/`                         |
| Radix surface                           | One import: `Slot` in `components/ui/button.tsx:5`, a polymorphism helper, not an accessibility primitive |
| Component library size                  | `components/` is 376 lines across 6 tsx files                                                             |

What actually exists is 7,152 lines of plain Tailwind React in `features/`. That is a real asset,
but it is not an accessible-component ecosystem, and porting it to RN primitives is a cost that
the unified option and the split option pay equally.

The strongest stated argument against unifying is therefore void.

### 2. "Expo managed" cannot host what this app already does

ADR-0014 and the roadmap assume an Expo managed app. The current Android app contains 463 lines of
bespoke Java that managed Expo has no equivalent for:

| File                               | Lines | What it does                                                                 |
| ---------------------------------- | ----: | ---------------------------------------------------------------------------- |
| `CountdownFormatter.java`          |   208 | Boundary formatting and SharedPreferences state for the ongoing notification |
| `LocationEnablerPlugin.java`       |    84 | Google Play Services in-app resolution for the device GPS switch             |
| `AlarmAudioPlugin.java`            |    77 | Parallel `USAGE_ALARM` channels so the adhan plays on silent                 |
| `CountdownNotificationPlugin.java` |    56 | WorkManager-driven persistent countdown                                      |
| `CountdownWorker.java`             |    20 | The periodic worker itself                                                   |

Reproducing these under Expo requires config plugins and a development build, not the managed
workflow. That is true for both React Native options, so it does not choose between them, but the
ADR and roadmap should stop saying "Expo managed".

## The evidence that cuts the other way

Between 2026-07-22 and 2026-07-25 the owner shipped eight consecutive PRs whose only purpose was
making a WebView stop feeling like a WebView: NBD-72 global CSS to kill WebView tells, NBD-73
haptics, NBD-74 edge-to-edge status bar, NBD-75 hardware back button, NBD-76 cold-start splash,
NBD-77 bottom sheet presentation, NBD-78 route transitions, NBD-79 keyboard-aware inputs. Two
weeks later the same owner wrote ADR-0014 choosing React Native.

Read as revealed preference, that is the real reason ADR-0014 exists, and it is a better reason
than the one the ADR wrote down. It says the dissatisfaction was not one missing plugin. It
spanned visual feel, navigation, system chrome, touch feedback, keyboard behavior, modal
presentation and lifecycle, which are structural WebView seams.

It does not prove React Native would feel better on its own. Every one of those eight concerns
still has to be implemented deliberately in RN.

## The three architectures

### A. Vite SPA + Capacitor

Drop Next.js, keep the existing Android shell. `capacitor.config.ts` changes `webDir` from `out`
to `apps/spa/dist`, and the four Java plugins, branded resources, alarm reliability and location
flow all carry over unchanged.

Cheapest by a wide margin, and it satisfies the written goal: no Next.js, one production web app,
a real launcher icon, an installable APK, one UI to maintain. It also directly contradicts the
preference the eight PRs revealed, and keeps the app's data in WebView browser storage.

### B. Vite SPA + Expo React Native, split (what ADR-0014 says today)

Two applications, two UI trees, shared logic in `packages/shared`.

This pays the full native re-implementation cost **and** commits to maintaining two presentation
systems forever. The roadmap makes that explicit: "NativeWind v4 + hand-built RN components
mirroring shadcn visually". With no Radix/shadcn asset to protect, the duplication is hard to
justify, and it sits badly against the owner's own decision that no code should be duplicated
between the apps and that both should be easy to add features to.

### C. Unified Expo/React Native Web + a separate static landing page

One product UI tree serving both Android and `/app/*` on the web, with platform adapters for
storage and device capabilities, and a small static Vite page owning `/` for SEO and branding.

Honors the preference the eight PRs revealed, gives Android real native rendering and SQLite,
avoids the permanent duplication, and keeps `packages/shared` as the domain core. Its risks are
real and unproven for this app: Arabic RTL under RNW, web accessibility, responsive layout,
fonts, and bundle weight on a web surface the owner wants to be fast.

## What actually decides this

Not more argument. All three options share one gating unknown, and it is the largest risk in the
whole migration: **can Expo reproduce this app's four hard native behaviors on a real device?**

- Exact prayer alarms with the Fajr-specific adhan, firing with the process absent
- The adhan playing on silent through parallel `USAGE_ALARM` channels
- The persistent countdown notification driven by WorkManager, with Hijri date and city
- The Google Play Services in-app GPS resolution flow

That question is identical for options B and C, and answering it collapses the three-way choice:

- **If the spike fails or is unreasonably painful**, both React Native options die and option A
  wins by default. We would have learned that in days rather than months.
- **If the spike succeeds**, the RN substrate is viable, and the remaining choice is B versus C,
  which is a user-interface question. With the Radix objection void, C is the stronger of the two
  unless a follow-up RNW spike shows its web story is unacceptable for an Arabic RTL app.

## Recommendation

1. **Run the Expo device-capability spike next**, time-boxed, on the owner's own device. It is a
   go/no-go experiment, not feature work. It ends in an installable APK that proves or disproves
   the four behaviors above.
2. **Do not build the SPA's `/app/*` routes until it reports.** This is the sequencing change that
   matters most. The plan as written builds the entire SPA product surface first, and under
   option C most of that would be rebuilt from RN primitives. Porting 7,152 lines twice because
   the order was wrong is the most expensive avoidable mistake available here.
3. **Proceed now with everything that is safe under all three options**: the parity ledger, the
   durability decision in its section F, `packages/shared`, and the landing page with its full
   SEO and branding pass. The landing page survives every option, including C, which keeps a
   static web page for `/` regardless.
4. **Split the native work into reviewable units** whatever wins. The current PR 2 combines Expo
   tooling, a new persistence layer, a complete second UI, every device integration, native test
   tooling, CI, branding and release signing. That is a program of work, not a pull request, and
   "one giant native PR followed by one owner test" makes review ceremonial.

## Decisions this memo asks for

1. Approve or reject running the Expo device-capability spike before further SPA product work.
2. Confirm that `/app/*` porting is paused until the spike reports.
3. Choose a durability path from section F of the parity ledger, or explicitly defer it with a
   date. It is currently unowned, and after migration there is no recovery path for multi-year
   devotional history.

Once decided, ADR-0014 is amended again to match, or superseded by a new ADR if the architecture
changes. Nothing here is applied to the ADR until the owner rules on it.
