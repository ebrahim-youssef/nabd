import { toArabicIndic } from '@nabd/shared'
import type { AdhkarCategory } from '@nabd/shared'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'

export function AdhkarList({ category }: { category: AdhkarCategory }) {
  const [counts, setCounts] = useState<Record<string, number>>({})

  return (
    <View className="gap-3" testID={`adhkar-list-${category.id}`}>
      {category.items.map((item) => {
        const count = counts[item.id] ?? 0
        const done = count >= item.repeat
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: done }}
            disabled={done}
            key={item.id}
            onPress={() => setCounts((previous) => ({ ...previous, [item.id]: count + 1 }))}
            testID={`adhkar-list-item-${item.id}`}
          >
            <View className="gap-2 rounded-card border border-border bg-surface p-4">
              <Text className="font-scripture text-scripture text-foreground">{item.text}</Text>
              <Text className="text-small text-muted-foreground">
                {toArabicIndic(count)}/{toArabicIndic(item.repeat)}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
