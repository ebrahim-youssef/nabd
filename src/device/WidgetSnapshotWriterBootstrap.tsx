import { useSQLiteContext } from 'expo-sqlite'
import { useEffect, useMemo } from 'react'
import { AppState } from 'react-native'

import { resolveWirdDay } from '../day-plan/logic'
import { toDayId } from '../lib/day'
import { versionInForce } from '../lib/wird'
import { logger } from '../observability/logger'
import { createOnboardingRepository } from '../onboarding/db'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import {
  computeDayTimes,
  currentTimeZone,
  dateForCalendarDayInTimeZone,
  DEFAULT_METHOD_ID,
  isCalculationMethodId,
} from '../prayer-times/logic'
import { createDeviceRepository } from './db'
import { getLastPrayerActionDrainFailed } from './prayerActionDrain'
import { createWirdRepository } from '../wird/db'
import { buildWidgetSnapshot } from './widgetSnapshot'
import {
  configureWidgetSnapshotWriter,
  publishWidgetSnapshot,
  requestWidgetSnapshotWrite,
} from './widgetSnapshotWriter'

const WIDGET_WRITE_OPERATION = 'build-widget-snapshot'

export function WidgetSnapshotWriterBootstrap(): null {
  const database = useSQLiteContext()
  const repositories = useMemo(
    () => ({
      device: createDeviceRepository(database),
      onboarding: createOnboardingRepository(database),
      preferences: createPreferencesRepository(database),
      wird: createWirdRepository(database),
    }),
    [database],
  )

  useEffect(() => {
    const writeFromRepositories = async () => {
      try {
        const onboarding = await repositories.onboarding.load()
        if (!onboarding) {
          publishWidgetSnapshot(null, false)
          return
        }

        const now = Date.now()
        const [location, methodValue] = await Promise.all([
          repositories.device.readLocationCacheState(now),
          repositories.preferences.read(PREFERENCE_KEYS.calculationMethod),
        ])
        const methodId = isCalculationMethodId(methodValue) ? methodValue : DEFAULT_METHOD_ID
        const timeZone = currentTimeZone()
        const todayDate = dateForCalendarDayInTimeZone(now, timeZone)
        const coordinates = location
          ? { latitude: location.latitude, longitude: location.longitude }
          : null
        const calendarTimes = coordinates ? computeDayTimes(coordinates, todayDate, methodId) : null
        const day = resolveWirdDay(now, calendarTimes)
        const [versions, entries] = await Promise.all([
          repositories.wird.listVersions(),
          repositories.wird.getDayEntries(day),
        ])
        const version = versionInForce(versions, day) ?? onboarding.activeWird
        const dayOffset = toDayId(todayDate) === day ? 0 : -1
        const dayDate = dateForCalendarDayInTimeZone(now, timeZone, dayOffset)
        const tomorrowDate = dateForCalendarDayInTimeZone(now, timeZone, dayOffset + 1)
        const times = coordinates ? computeDayTimes(coordinates, dayDate, methodId) : null
        const nextFajr = coordinates
          ? computeDayTimes(coordinates, tomorrowDate, methodId).fajr
          : null
        const snapshot = buildWidgetSnapshot({
          now,
          day,
          versionId: version?.id ?? null,
          times,
          nextFajr,
          definition: version.definition,
          entries,
          writeFailed: getLastPrayerActionDrainFailed(),
        })
        if (!snapshot) {
          publishWidgetSnapshot(null, true)
          return
        }
        publishWidgetSnapshot(snapshot, true)
      } catch (cause: unknown) {
        logger.error('Widget snapshot repository read failed', cause, {
          operation: WIDGET_WRITE_OPERATION,
        })
      }
    }
    const unregister = configureWidgetSnapshotWriter(writeFromRepositories)
    void requestWidgetSnapshotWrite()
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void requestWidgetSnapshotWrite()
    })
    return () => {
      appState.remove()
      unregister()
    }
  }, [repositories])

  return null
}
