[العربية](./README.md) · **English**

# nabd

A companion for your daily wird. It helps you commit to a daily devotional routine, track it,
hold yourself to account (محاسبة), and look back over your worship as the days go by.

"nabd" means pulse. The daily wird is the believer's pulse, and nabd helps you keep it steady.

The interface is entirely in Arabic, right to left.

## Current state

The product is one Expo React Native app in `apps/native`, with Android as the first platform.
The feature boundaries keep a future iOS target possible. Full parity with the current product is
still in progress.

- **Available now:** onboarding, wird, adhkar, intentions, prayer times, qada, statistics, local
  SQLite persistence, and some device features.
- **Still open:** daily adhkar and settings parity, detailed statistics, permission and notification
  states, backup and restore, and final Android device verification.

The legacy web application was deleted in NBD-107 and NBD-108. Google sign-in and Supabase
cross-device sync remain out of the product under ADR-0014.

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

The Expo app works offline and stores data locally in SQLite through feature repositories. The
product currently has no backend, sign-in, or cross-device sync.

## Where it runs

- **Current app:** the Expo React Native app in `apps/native`, with Android as the first release.
- **Current code boundary:** feature folders under `apps/native/src` own their code and tests.

## Tech

The app uses Expo, Expo Router, SQLite, and device APIs. Android is first, with feature boundaries
kept ready for iOS.

## Run locally

See [`docs/run-locally.md`](./docs/run-locally.md).

## Working on this repo (humans and AIs)

Everything starts at [`AGENTS.md`](./AGENTS.md), and every change follows the path described in
[`docs/workflow.md`](./docs/workflow.md), from idea to a verified production deploy.
