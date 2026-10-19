import { Check, RotateCcw } from 'lucide-react-native'
import { toArabicIndic } from '../lib/format'
import { COPY as ADHKAR_COPY } from './copy'
import type { AdhkarCategory } from '../content/adhkar'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeTokens } from '../../theme/palette'
import { Text } from '../shell/Text'

const COUNT_INCREMENT = 1
const PERCENTAGE_MAX = 100
const TRACK_MIN_REPEAT = 2

export function AdhkarList({ category }: { category: AdhkarCategory }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const theme = useThemeTokens()

  function increment(id: string, repeat: number) {
    setCounts((previous) => ({
      ...previous,
      [id]: Math.min((previous[id] ?? 0) + COUNT_INCREMENT, repeat),
    }))
  }

  function reset(id: string) {
    setCounts((previous) => ({ ...previous, [id]: 0 }))
  }

  return (
    <View className="gap-3" testID={`adhkar-list-${category.id}`}>
      {category.items.map((item) => {
        const count = counts[item.id] ?? 0
        const done = count >= item.repeat
        const progress = Math.min((count / item.repeat) * PERCENTAGE_MAX, PERCENTAGE_MAX)

        return (
          <View
            className={`gap-3 rounded-card border p-4 ${done ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface shadow-card-sm'}`}
            key={item.id}
          >
            <Text className="font-scripture text-scripture text-start text-foreground">
              {item.text}
            </Text>
            {item.virtue && (
              <Text className="text-small text-muted-foreground text-start">{item.virtue}</Text>
            )}

            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: done }}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-card border border-primary/40 bg-primary/10 p-3"
                disabled={done}
                onPress={() => increment(item.id, item.repeat)}
                testID={`adhkar-list-count-${item.id}`}
              >
                {done && <Check accessible={false} color={theme.hex.primary} size={ICON_SIZE} />}
                <Text className="text-body text-primary" testID={`adhkar-list-progress-${item.id}`}>
                  {toArabicIndic(count)}/{toArabicIndic(item.repeat)}
                </Text>
                {done && <Text className="text-body text-primary">{ADHKAR_COPY.done}</Text>}
              </Pressable>
              <Pressable
                accessibilityLabel={ADHKAR_COPY.reset}
                accessibilityRole="button"
                className="min-h-11 min-w-11 items-center justify-center rounded-card border border-border bg-surface"
                onPress={() => reset(item.id)}
                testID={`adhkar-list-reset-${item.id}`}
              >
                <RotateCcw
                  accessible={false}
                  color={theme.hex['muted-foreground']}
                  size={ICON_SIZE}
                />
              </Pressable>
            </View>

            {item.repeat >= TRACK_MIN_REPEAT && (
              <View
                accessible={false}
                className="h-1 w-full overflow-hidden rounded-chip bg-surface-2"
                testID={`adhkar-list-track-${item.id}`}
              >
                <View
                  className="h-full rounded-chip bg-gold"
                  style={{ width: `${progress}%` }}
                  testID={`adhkar-list-track-progress-${item.id}`}
                />
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}
