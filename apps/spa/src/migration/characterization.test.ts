import 'fake-indexeddb/auto'

import { beforeEach, describe, it } from 'vitest'

import {
  assertPreferenceCharacterization,
  assertRepositoryCharacterization,
  seedPreferenceCharacterization,
  seedRepositoryCharacterization,
} from '@nabd/shared/testing'
import type { SharedPreferenceFixture } from '@nabd/shared/testing'

import { applyMode, applyTheme, readMode, readTheme } from '../app/appearance'
import { dhikrCompletionRepository } from '../counter/db'
import { db } from '../db/db'
import { readNotificationPrefs, writeNotificationPrefs } from '../notifications/preferences'
import { onboardingRepository } from '../onboarding/db'
import { COORDS_KEY, readCachedCoords } from '../prayer-times/location'
import { applyCalculationMethodId, readCalculationMethodId } from '../prayer-times/prayerMethod'
import { qadaRepository } from '../qada/db'
import { wirdRepository } from '../wird/db'

beforeEach(async () => {
  localStorage.clear()
  await db.transaction(
    'rw',
    db.wirdVersions,
    db.wirdEntries,
    db.adhkarFlow,
    db.qadaEvents,
    async () => {
      await Promise.all([
        db.wirdVersions.clear(),
        db.wirdEntries.clear(),
        db.adhkarFlow.clear(),
        db.qadaEvents.clear(),
      ])
    },
  )
})

describe('migration characterization fixture', () => {
  it('proves the Dexie repository behavior', async () => {
    const repositories = {
      wird: wirdRepository,
      qada: qadaRepository,
      dhikrCompletion: dhikrCompletionRepository,
      onboarding: onboardingRepository,
    }
    const seeded = await seedRepositoryCharacterization(repositories)

    await assertRepositoryCharacterization(repositories, seeded)
  })

  it('round-trips the SPA-local preferences without native-only preferences', async () => {
    const adapter = {
      async writeSharedPreferences(values: SharedPreferenceFixture) {
        applyTheme(values.theme)
        applyMode(values.mode)
        applyCalculationMethodId(values.calculationMethod)
        localStorage.setItem(COORDS_KEY, JSON.stringify(values.coords))
        writeNotificationPrefs(values.notifications)
      },
      async readSharedPreferences() {
        const coords = readCachedCoords()
        if (!coords)
          throw new Error('SPA characterization adapter could not read cached coordinates')
        return {
          theme: readTheme(),
          mode: readMode(),
          calculationMethod: readCalculationMethodId(),
          coords,
          notifications: readNotificationPrefs(),
        }
      },
    }

    await seedPreferenceCharacterization(adapter, { includeNativeOnly: false })
    await assertPreferenceCharacterization(adapter, { includeNativeOnly: false })
  })
})
