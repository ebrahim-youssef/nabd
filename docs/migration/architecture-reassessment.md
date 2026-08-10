# Architecture reassessment, 2026-08-09

Status: **resolved 2026-08-10.** Kept as the record of how the question was asked and answered.
The rest of this memo is the analysis as written on 2026-08-09, unchanged.

## Decision (2026-08-10)

The owner answered the memo's first question directly: they wanted native capabilities the WebView
could not provide.

That settles it, and it settles it on a requirement rather than on decision lineage, which is what
ADR-0014 was missing.

- **Option A, SPA + Capacitor, is rejected.** Not on cost, and not because reversing it would
  contradict an earlier ADR, but because the WebView substrate does not deliver a stated
  requirement. This is the repository-specific argument against Capacitor that ADR-0014 never
  made.
- **Option B, the split in ADR-0014, is confirmed.** The owner wants both a fast, SEO-strong web
  app and real native capability. Option C would rebuild the web UI from React Native Web
  primitives, trading away the first to buy single-tree maintenance that was never asked for, and
  it carries the highest up-front cost of the three. B keeps the existing DOM and Tailwind UI for
  the web and spends the effort where the requirement actually is.
- **One correction to ADR-0014 still stands**, recorded as A8 of its amendment: the app is Expo
  with config plugins and a development build, not Expo managed. Managed cannot host the existing
  alarm-audio channels, the WorkManager countdown, or the Play Services location resolution.

The device-capability spike is still the next step, but its status changes. It is no longer a
three-way tiebreaker. It is now a feasibility gate on the confirmed architecture: it must prove
Expo can reproduce what the Capacitor app already does, and the answer decides schedule and scope,
not direction.

`/app/*` porting is unblocked. Under the confirmed split the SPA keeps its own presentation tree,
so that work is no longer at risk of being thrown away.

**Still open, and now the highest-value unknown:** which native capabilities the WebView could not
provide. If there are capabilities the owner wanted and never got, they are requirements the parity
ledger does not contain, because the ledger describes what exists rather than what was wanted. They
need capturing before native feature work is called complete.

## Why this was reopened

The owner asked for a reassessment of whether the planned four-PR migration is the right fit for
the goal. It was reviewed by two independent passes.

They converged on two things: the delivery units are too large to review, and two of the facts
ADR-0014 reasoned from are wrong.

They did **not** converge on the architecture, and the disagreement is worth knowing about. The
second pass initially ranked SPA + Capacitor first. It moved Capacitor to last only after being
shown the NBD-72 to NBD-79 sequence below, which was put to it as the strongest counter-evidence
to its own position. A reviewer that reverses after one piece of evidence is presented
one-sidedly is not an independent confirmation, so this memo does not claim consensus. It sets
out the options and asks for an experiment instead.

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
but it is not an accessible-component ecosystem.

What this does and does not change: the ADR's claim that unifying means rebuilding the web UI
from RN primitives is **true**, and stays true, because DOM React cannot render in an RN tree
regardless of which component library it uses. What is void is only the premium the ADR attached
to that loss, the "ecosystem's accessibility/interaction maintenance" being traded away for
"hand-rolled equivalents". There is no such ecosystem here to lose. The argument narrows; it does
not disappear.

So the port cost is real, and it is **not** symmetric between the options:

|              | What happens to the 7,152 lines                                   |
| ------------ | ----------------------------------------------------------------- |
| A. Capacitor | Reused as-is. Next to Vite is mostly mechanical.                  |
| B. Split     | Reused for the web app; a second RN tree is written alongside it. |
| C. Unified   | Discarded, rebuilt from RN primitives, plus RNW's own web risk.   |

C is strictly the most up-front work. Its advantage is one tree instead of two afterwards. That
is a genuine trade between up-front cost and long-term maintenance, not a free win.

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

This memo cannot tell you what that sequence meant, and will not try. It reads two ways. It could
be evidence that the WebView substrate kept costing effort across visual feel, navigation, system
chrome, touch feedback, keyboard behavior, modal presentation and lifecycle, which are structural
WebView seams. It could equally be successful polish on a shipping product, finished and behind
you.

The ADR does not say either way. Its stated driver is the Next.js server-first mismatch, which
the SPA alone resolves. So the question goes back to the owner: **was WebView feel an actual
driver of ADR-0014?** If yes, option A is largely ruled out no matter what it costs. If it was
finished work rather than a running sore, A is back on the table as the cheapest path.

Either way, none of those eight concerns comes free in React Native. Each still has to be
implemented there deliberately.

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

The existing web UI is reused for `apps/spa`, so the web side is comparatively cheap. The native
side is written from nothing, and the two then evolve in parallel forever. The roadmap makes the
duplication explicit: "NativeWind v4 + hand-built RN components mirroring shadcn visually".

That permanent duplication sits badly against the owner's own decision that no code should be
duplicated between the apps, and against "easy to add features to", since every future feature is
built twice. It is worth noting that the no-duplication gate as written covers logic, tokens,
types and copy but explicitly not presentation, so this architecture does not violate the gate. It
just means the gate never covered the expensive half.

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
- **If the spike succeeds**, the RN substrate is viable, and the remaining choice is B versus C.
  That one is a straight trade: B reuses the existing web UI and pays for two trees forever, C
  rebuilds the web UI once and maintains one tree. It should be decided by a second, smaller RNW
  spike proving Arabic RTL, fonts, responsive layout and web accessibility for this app, not by
  argument either.

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

1. **Was WebView feel an actual driver of ADR-0014?** Only the owner can answer this, and it is
   the single input that most narrows the choice. If yes, option A is out regardless of cost.
2. Approve or reject running the Expo device-capability spike before further SPA product work.
3. Confirm that `/app/*` porting is paused until the spike reports. The landing page, SEO and
   branding work is not paused; it is safe under all three.
4. Choose a durability path from section F of the parity ledger, or explicitly defer it with a
   date. It is currently unowned, and after migration there is no recovery path for multi-year
   devotional history.

Once decided, ADR-0014 is amended again to match, or superseded by a new ADR if the architecture
changes. Nothing here is applied to the ADR until the owner rules on it.
