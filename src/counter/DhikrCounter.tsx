import { toArabicIndic } from '../lib/format'
import type { DayId } from '../wird/types'
import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'
import { useDhikrCounter } from './useDhikrCounter'

const CHECKMARK = '✓'

type DhikrCounterProps = {
  day: DayId
  itemId: string
  label: string
  target: number
  done: boolean
}

export function DhikrCounter({ day, itemId, label, target, done }: DhikrCounterProps) {
  const { count, tap } = useDhikrCounter(day, itemId, target, done)
  const progress = Math.min((count / target) * 100, 100)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      onPress={() => void tap()}
      testID={`dhikr-${itemId}`}
    >
      <View
        className={`relative flex-row items-center justify-between gap-3 overflow-hidden rounded-card border p-3 ${
          done ? 'border-accent bg-accent/10' : 'border-line bg-surface'
        }`}
      >
        <Text className={`min-w-0 flex-1 text-body ${done ? 'text-ink' : 'text-ink'}`}>
          {label}
        </Text>
        {done ? (
          <View
            className="h-6 w-6 shrink-0 items-center justify-center rounded-pill border-2 border-accent bg-accent"
            testID={`dhikr-check-${itemId}`}
          >
            <Text className="text-body text-on-accent">{CHECKMARK}</Text>
          </View>
        ) : (
          <Text
            className="shrink-0 rounded-pill bg-accent/10 px-2 py-1 text-meta font-sans-medium text-accent"
            testID={`dhikr-count-${itemId}`}
          >
            {toArabicIndic(count)}/{toArabicIndic(target)}
          </Text>
        )}
        {!done && (
          <View className="absolute bottom-0 start-0 h-1 w-full overflow-hidden rounded-pill bg-line">
            <View className="h-full rounded-pill bg-accent" style={{ width: `${progress}%` }} />
          </View>
        )}
      </View>
    </Pressable>
  )
}
