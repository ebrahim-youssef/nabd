import { View } from 'react-native'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import type { DayId } from '../wird/types'

export function TodayRoute({ day }: { day: DayId }) {
  return (
    <ScreenContainer testID="today-screen">
      <View className="gap-6">
        <PageHeader backHref="/today" title="اليوم" />
        <Text className="text-body text-ink" testID="today-day">
          {day}
        </Text>
      </View>
    </ScreenContainer>
  )
}
