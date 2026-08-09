[العربية](./README.md) · **English**

# nabd

A companion for your daily wird. It helps you commit to a daily devotional routine, track it,
hold yourself to account (محاسبة), and look back over your worship as the days go by.

"nabd" means pulse. The daily wird is the believer's pulse, and nabd helps you keep it steady.

The interface is entirely in Arabic, right to left.

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

nabd is offline-first. Your data lives on your device first, so the app runs in full even when
the connection drops, then syncs to your account once you sign in so you find it on all your
devices.

## Where it runs

- **Installable web app (PWA)**: opens in the browser and installs to the home screen.
- **Native Android app**: built on Capacitor, with exact prayer notifications that fire while
  the app is closed, and a native feel in touch, motion, and appearance.

## Tech

Next.js (App Router) and TypeScript, Tailwind with shadcn/ui, Dexie for local storage with
Supabase for sync and sign-in, Zustand for state, a service worker via Serwist, prayer-time
calculation with the adhan library, and an Android shell via Capacitor. Tests run on Vitest and
Playwright, deploys go to Vercel, and monitoring is through Sentry and Vercel Analytics.

## Run locally

See [`docs/run-locally.md`](./docs/run-locally.md).

## Working on this repo (humans and AIs)

Everything starts at [`AGENTS.md`](./AGENTS.md), and every change follows the path described in
[`docs/workflow.md`](./docs/workflow.md), from idea to a verified production deploy.
