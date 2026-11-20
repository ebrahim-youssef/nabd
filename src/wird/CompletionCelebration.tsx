import { useSQLiteContext } from 'expo-sqlite'
import { Star } from 'lucide-react-native'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Share, View } from 'react-native'

import { useThemeColors } from '../../theme/tokens'
import { buildDayPlan } from '../day-plan/logic'
import { useWirdToday } from '../day-plan/WirdTodayProvider'
import { lastNDays, monthOf } from '../lib/day'
import { versionInForce } from '../lib/wird'
import { formatStreak } from '../more/copy'
import { logger } from '../observability/logger'
import { createOnboardingRepository } from '../onboarding/db'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import { Text } from '../shell/Text'
import { useLiveRepositoryQuery } from '../shell/useLiveRepositoryQuery'
import { currentStreak, rangeCompletion } from '../stats/logic'
import { STATS_WINDOW_DAYS } from '../stats/useStats'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { WIRD_COPY } from './copy'
import { useWirdRepository } from './useWirdRepository'

const CELEBRATION_ICON_SIZE = 40

export function CompletionCelebration() {
  const day = useWirdToday()
  const database = useSQLiteContext()
  const repository = useWirdRepository()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const theme = useThemeColors()
  const [celebratedDay, setCelebratedDay] = useState<string | null | undefined>(undefined)
  const [visibleDay, setVisibleDay] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const inFlight = useRef(false)
  const failedDays = useRef(new Set<string>())
  const current = useRef({ day, isComplete: false })

  const read = useCallback(async () => {
    const days = lastNDays(day, STATS_WINDOW_DAYS)
    const [versions, entries, monthEntries, rangeEntries, onboarding] = await Promise.all([
      repository.listVersions(),
      repository.getDayEntries(day),
      repository.getMonthEntries(monthOf(day)),
      repository.getEntriesInRange(days[0], days[days.length - 1]),
      createOnboardingRepository(database).load(),
    ])
    const version = versionInForce(versions, day) ?? onboarding?.activeWird
    if (!version) return { day, progress: { done: 0, required: 0 }, streak: 0 }
    const plan = buildDayPlan({
      day,
      now: Date.now(),
      times: null,
      nextFajr: null,
      definition: version.definition,
      entries,
      monthEntries,
    })
    const streak = currentStreak(rangeCompletion(versions, rangeEntries, days))
    return { day, progress: plan.progress, streak }
  }, [database, day, repository])
  const { data } = useLiveRepositoryQuery(read)
  const isComplete =
    data?.day === day && data.progress.required > 0 && data.progress.done === data.progress.required
  useLayoutEffect(() => {
    current.current = { day, isComplete }
  }, [day, isComplete])

  useEffect(() => {
    let active = true
    void preferences.read(PREFERENCE_KEYS.celebratedDay).then(
      (value) => {
        if (active) setCelebratedDay(value)
      },
      (cause: unknown) => {
        logger.error('Native celebration preference read failed', cause, {
          day: current.current.day,
        })
      },
    )
    return () => {
      active = false
    }
  }, [preferences])

  useEffect(() => {
    if (
      !isComplete ||
      celebratedDay === undefined ||
      celebratedDay === day ||
      failedDays.current.has(day) ||
      inFlight.current
    )
      return
    inFlight.current = true
    void preferences
      .write(PREFERENCE_KEYS.celebratedDay, day, Date.now())
      .then(
        () => {
          setCelebratedDay(day)
          if (current.current.day === day && current.current.isComplete) setVisibleDay(day)
        },
        (cause: unknown) => {
          failedDays.current.add(day)
          logger.error('Native celebration preference write failed', cause, { day })
        },
      )
      .finally(() => {
        inFlight.current = false
        setAttempt((value) => value + 1)
      })
  }, [attempt, celebratedDay, day, isComplete, preferences])

  const share = () => {
    void Share.share({ message: WIRD_COPY.celebrationShareText }).catch((cause: unknown) => {
      logger.error('Native celebration share failed', cause, { day })
    })
  }
  const close = () => setVisibleDay(null)
  if (celebratedDay === undefined || !data) return null

  const footer = (
    <View className="gap-2">
      <Button label={WIRD_COPY.celebrationDismiss} onPress={close} variant="solid" />
      <Button label={WIRD_COPY.celebrationShare} onPress={share} />
    </View>
  )
  const streak = formatStreak(data?.streak ?? 0)

  return (
    <BottomSheet
      footer={footer}
      onClose={close}
      title={WIRD_COPY.celebrationTitle}
      visible={visibleDay === day}
    >
      <View className="items-center gap-4 py-4">
        <Star
          accessible={false}
          color={theme.gold}
          fill={theme.gold}
          size={CELEBRATION_ICON_SIZE}
        />
        <Text className="text-center text-body text-ink">{WIRD_COPY.celebrationHadith}</Text>
        {streak ? <Text className="text-center text-meta text-mute">{streak}</Text> : null}
      </View>
    </BottomSheet>
  )
}
