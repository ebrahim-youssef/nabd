import { WIRD_LEVELS, levelById, toDayId } from '@nabd/shared'
import { useEffect, useState } from 'react'
import { AppState, View } from 'react-native'

import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import type { PersistedOnboarding } from '../onboarding/db'
import { CompletionCelebration } from '../wird/CompletionCelebration'
import { TodaySummary } from '../wird/TodaySummary'
import { WirdChecklist } from '../wird/WirdChecklist'
import { WirdDayProvider } from '../wird/WirdDayProvider'

export function HomeScreen({ persisted }: { persisted: PersistedOnboarding }) {
  const level = levelById(WIRD_LEVELS, persisted.selectedLevelId)
  const [currentDay, setCurrentDay] = useState(() => toDayId(new Date()))

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setCurrentDay(toDayId(new Date()))
    })
    return () => subscription.remove()
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
