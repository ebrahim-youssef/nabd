import { toArabicIndic } from '@nabd/shared'
import type { DayId } from '@nabd/shared'
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
          done ? 'border-primary bg-primary/10' : 'border-border bg-surface'
        }`}
      >
        <Text className={`text-body ${done ? 'text-muted-foreground' : 'text-foreground'}`}>
          {label}
        </Text>
        {done ? (
          <View className="h-6 w-6 shrink-0 items-center justify-center rounded-icon border-2 border-primary bg-primary">
            <Text className="text-body text-on-primary">{CHECKMARK}</Text>
          </View>
        ) : (
          <Text
            className="shrink-0 rounded-chip bg-primary/10 px-2 py-1 text-small font-body-medium text-primary"
            testID={`dhikr-count-${itemId}`}
          >
            {toArabicIndic(count)}/{toArabicIndic(target)}
          </Text>
        )}
        {!done && (
          <View className="absolute bottom-0 start-0 h-1 w-full overflow-hidden rounded-chip bg-border">
            <View className="h-full rounded-chip bg-accent" style={{ width: `${progress}%` }} />
          </View>
        )}
      </View>
    </Pressable>
  )
}
