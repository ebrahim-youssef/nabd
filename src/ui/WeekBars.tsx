import { View } from 'react-native'

import { Text } from '../shell/Text'

const ZERO_BAR_HEIGHT = 4
const FULL_RATIO = 1

export function WeekBars({
  days,
  summary,
}: {
  days: { label: string; ratio: number; isToday?: boolean }[]
  summary: string
}) {
  return (
    <View
      accessibilityLabel={summary}
      accessible
      className="rounded-tile border border-line bg-surface p-3.5"
    >
      <View className="h-[110px] flex-row items-end justify-around gap-2">
        {days.map(({ label, ratio, isToday }) => {
          const safeRatio = Math.max(0, Math.min(FULL_RATIO, ratio))
          return (
            <View className="h-full flex-1 items-center justify-end" key={label}>
              <View
                className={`w-full rounded-t-control ${
                  safeRatio === FULL_RATIO ? 'bg-gold' : 'border border-line bg-track'
                } ${isToday ? 'border-2 border-accent' : ''}`}
                style={{
                  height:
                    safeRatio === 0
                      ? ZERO_BAR_HEIGHT
                      : `${Math.max(ZERO_BAR_HEIGHT, safeRatio * 100)}%`,
                }}
              />
            </View>
          )
        })}
      </View>
      <View className="mt-2 flex-row justify-around">
        {days.map(({ label }) => (
          <Text className="font-sans text-caption text-mute" key={label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}
