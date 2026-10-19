import { WIRD_LEVELS } from '../content/levels'
import { toDayId } from '../lib/day'
import { levelById } from '../onboarding/logic'
import { useEffect, useState } from 'react'
import { AppState, View } from 'react-native'

import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import type { PersistedOnboarding } from '../onboarding/db'
import { CompletionCelebration } from '../wird/CompletionCelebration'
import { TodaySummary } from '../wird/TodaySummary'
import { WirdChecklist } from '../wird/WirdChecklist'
import { WirdDayProvider } from '../wird/WirdDayProvider'
import { useWirdLevel } from '../wird/useWirdLevel'

const DAY_CHECK_INTERVAL_MS = 60_000

export function HomeScreen({ persisted }: { persisted: PersistedOnboarding }) {
  const { currentLevelId, canChangeLevel: hasLiveVersion } = useWirdLevel()
  // A failed or pending read has no version, so keep the onboarding level until one arrives.
  const selectedLevelId = hasLiveVersion ? currentLevelId : persisted.selectedLevelId
  const level = levelById(WIRD_LEVELS, selectedLevelId)
  const [currentDay, setCurrentDay] = useState(() => toDayId(new Date()))

  useEffect(() => {
    const syncDay = () => setCurrentDay(toDayId(new Date()))
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncDay()
    })
    // Home can stay open across midnight; the checklist must move to the new day with the times.
    const timer = setInterval(syncDay, DAY_CHECK_INTERVAL_MS)
    return () => {
      subscription.remove()
      clearInterval(timer)
    }
  }, [])

  if (!level) return null

  return (
    <WirdDayProvider day={currentDay}>
      <ScreenContainer testID="home-shell">
        <View className="gap-6">
          <Text
            accessibilityRole="header"
            className="font-display text-title text-start text-primary"
          >
            {level.title}
          </Text>
          <TodaySummary />
          <WirdChecklist />
        </View>
        <CompletionCelebration />
      </ScreenContainer>
    </WirdDayProvider>
  )
}
