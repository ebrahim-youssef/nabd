import { WIRD_LEVELS, levelById, toDayId } from '@nabd/shared'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { ScreenContainer } from '../onboarding/OnboardingGate'
import type { PersistedOnboarding } from '../onboarding/db'
import { CompletionCelebration } from '../wird/CompletionCelebration'
import { TodaySummary } from '../wird/TodaySummary'
import { WirdChecklist } from '../wird/WirdChecklist'
import { WirdDayProvider } from '../wird/WirdDayProvider'

export function HomeScreen({ persisted }: { persisted: PersistedOnboarding }) {
  const level = levelById(WIRD_LEVELS, persisted.selectedLevelId)
  const [day] = useState(() => toDayId(new Date()))
  if (!level) return null

  return (
    <WirdDayProvider day={day}>
      <ScreenContainer testID="home-shell">
        <View className="gap-6">
          <Text accessibilityRole="header" className="text-title text-start text-primary">
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
