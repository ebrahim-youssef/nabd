import { ADHKAR_COPY, toArabicIndic } from '@nabd/shared'
import type { AdhkarCategory } from '@nabd/shared'
import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'
import { useAdhkarFlow } from './useAdhkarFlow'

export function AdhkarFlow({ category }: { category: AdhkarCategory }) {
  const { state, tap, restart, markedInWird } = useAdhkarFlow(category.id, category.items)
  if (state.finished) {
    return (
      <View className="gap-3 rounded-card bg-primary p-6" testID={`adhkar-flow-${category.id}`}>
        <Text className="text-body text-on-primary">{ADHKAR_COPY.finished}</Text>
        {markedInWird && (
          <Text className="text-small text-on-primary">{ADHKAR_COPY.markedInWird}</Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={restart}
          testID={`adhkar-restart-${category.id}`}
        >
          <Text className="text-small text-on-primary">{ADHKAR_COPY.restart}</Text>
        </Pressable>
      </View>
    )
  }
  const active = category.items[state.index]
  if (!active) return null
  return (
    <View className="gap-3" testID={`adhkar-flow-${category.id}`}>
      <Pressable accessibilityRole="button" onPress={tap} testID={`adhkar-active-${category.id}`}>
        <View className="gap-3 rounded-card bg-primary p-6">
          <Text className="font-scripture text-scripture text-on-primary">{active.text}</Text>
          <Text className="font-display text-title text-on-primary">
            {toArabicIndic(state.count)}/{toArabicIndic(active.repeat)}
          </Text>
          <Text className="text-small text-on-primary">{ADHKAR_COPY.tapHint}</Text>
        </View>
      </Pressable>
    </View>
  )
}
