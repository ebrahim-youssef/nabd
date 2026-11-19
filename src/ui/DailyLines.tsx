import { View } from 'react-native'

import { Text } from '../shell/Text'

type DailyLinesProps = {
  intention: { deed: string; text: string }
  dhikr: string
}

export function DailyLines({ intention, dhikr }: DailyLinesProps) {
  return (
    <View className="gap-0.5">
      <View className="flex-row items-baseline gap-2">
        <Text className="font-sans-bold text-caption text-gold-ink">نية اليوم</Text>
        <Text className="flex-1 font-text text-daily-line text-ink">{intention.text}</Text>
      </View>
      <View className="flex-row items-baseline gap-2">
        <Text className="font-sans-bold text-caption text-gold-ink">ذكر اليوم</Text>
        <Text className="flex-1 font-text text-daily-line text-ink">{dhikr}</Text>
      </View>
    </View>
  )
}
