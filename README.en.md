[العربية](./README.md) · **English**

# nabd

A companion for your daily wird. It helps you commit to a daily devotional routine, track it,
hold yourself to account (محاسبة), and look back over your worship as the days go by.

"nabd" means pulse. The daily wird is the believer's pulse, and nabd helps you keep it steady.

The interface is entirely in Arabic, right to left.

## Migration status

The currently working product is the root Next.js application and Capacitor shell. Two parity
replacements are being built without redesigning the product: a Vite and React Router web client
in `apps/spa`, and an Expo Android client in `apps/native`. All three clients now compile against
the canonical domain rules and Arabic content in `packages/shared`.

The replacement clients do not yet have full feature parity and are not production releases. The
Android client now has an Arabic onboarding gate that persists the selected level and initial wird
in SQLite and restores them when reopened; final Android device verification remains an owner gate.

## What it does

- **Daily wird**: a single page that lays out today's wird as a checklist you tick off:
  prayers and their sunan, adhkar, a portion of Qur'an, fasting, and voluntary deeds. What you
  tick stays saved even with no connection.
- **Levels and accountability**: on first launch a short questionnaire places you at a level
  that fits you, then builds your wird from it. You can change your level later in Settings,
  and it takes effect the next day.
- **Statistics**: every item in your wird opens to its own history: consistency rate, longest
  streak, and how many times it was missed, so you can see clearly where you stand on each act
  of worship.
- **Dhikr counter**: count your dhikr with a tap, and when you reach the target the linked
  wird item is marked done on its own.
- **Adhkar library**: morning and evening adhkar, adhkar after prayers and before sleep, and
  the daily adhkar, each with its text, count, virtue, and source.
- **Intentions library**: a curated set of intentions (نوايا) for each deed, each backed by
  its evidence from a verse or a hadith with its attribution.
- **Prayer times**: today's times with an indicator for the current and next prayer, and a
  calculation method you choose yourself.
- **Notifications**: prayer alerts (before the adhan, at the adhan, or at the iqama) and a
  reminder for the morning and evening adhkar, each moment with its own distinct sound.
- **Missed-prayer ledger**: a record of the prayers you owe, which you add to and draw down
  from as you make them up.

## Works offline

The current application is offline-first: it stores data locally, then syncs it to an account.
In the replacement architecture, full offline behavior belongs to the Android client. The new
web client does not promise offline operation and does not include sync or sign-in in this phase.

## Where it runs

- **Current release**: an installable web app with a Capacitor Android shell.
- **Replacement in progress**: a regular web client in `apps/spa` and an Expo Android client in
  `apps/native`; neither is approved for production yet.

## Tech

The current client uses Next.js, Dexie, Supabase, Serwist, and Capacitor. The replacement uses
Vite and React Router for web, Expo and SQLite for Android, and a platform-neutral shared
TypeScript package. The SPA will be prepared for Cloudflare, while Sentry remains the error
monitor. Verification spans Vitest, Playwright, React Native tests, and Maestro before the final
owner device check.

## Run locally

See [`docs/run-locally.md`](./docs/run-locally.md).

## Working on this repo (humans and AIs)

Everything starts at [`AGENTS.md`](./AGENTS.md), and every change follows the path described in
[`docs/workflow.md`](./docs/workflow.md), from idea to a verified production deploy.
