import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native'
import { toArabicIndic } from '../lib/format'
import { COPY as ADHKAR_COPY, STRIP_VISIBLE_COUNT } from './copy'
import { upcoming } from './logic'
import type { AdhkarCategory } from '../content/adhkar'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { Text } from '../shell/Text'
import { useAdhkarFlow } from './useAdhkarFlow'
import { useWirdToday } from '../day-plan/WirdTodayProvider'

const PERCENTAGE_MAX = 100

export function AdhkarFlow({ category }: { category: AdhkarCategory }) {
  const day = useWirdToday()
  const { state, tap, restart, markedInWird } = useAdhkarFlow(category.id, category.items, day)
  const theme = useThemeColors()

  if (state.finished) {
    return (
      <View className="gap-4">
        <View
          className="items-center gap-3 rounded-card bg-accent p-6"
          testID={`adhkar-flow-${category.id}`}
        >
          <Text className="text-body text-on-accent">{ADHKAR_COPY.finished}</Text>
          {markedInWird && (
            <Text className="text-meta text-on-accent">{ADHKAR_COPY.markedInWird}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-2 rounded-button border border-on-accent px-4 py-2"
            onPress={restart}
            testID={`adhkar-restart-${category.id}`}
          >
            <RotateCcw accessible={false} color={theme['on-accent']} size={ICON_SIZE} />
            <Text className="text-meta text-on-accent">{ADHKAR_COPY.restart}</Text>
          </Pressable>
        </View>
        <AdhkarReference category={category} />
      </View>
    )
  }

  const active = category.items[state.index]
  if (!active) return null

  const nextUp = upcoming(state, category.items, STRIP_VISIBLE_COUNT)
  const progress = Math.min((state.count / active.repeat) * PERCENTAGE_MAX, PERCENTAGE_MAX)

  return (
    <View className="gap-4" testID={`adhkar-flow-${category.id}`}>
      <Pressable
        accessibilityRole="button"
        className="items-center gap-4 rounded-card bg-accent p-6"
        onPress={tap}
        testID={`adhkar-active-${category.id}`}
      >
        <Text className="font-text text-daily-line text-on-accent text-start">{active.text}</Text>
        <Text className="font-display text-screen-title text-on-accent" testID="adhkar-flow-count">
          {toArabicIndic(state.count)}/{toArabicIndic(active.repeat)}
        </Text>
        <View
          accessible={false}
          className="h-1 w-full overflow-hidden rounded-pill bg-path-rest"
          testID={`adhkar-flow-track-${active.id}`}
        >
          <View className="h-full rounded-pill bg-gold" style={{ width: `${progress}%` }} />
        </View>
        <Text className="text-meta text-on-accent">{ADHKAR_COPY.tapHint}</Text>
      </Pressable>

      {nextUp.length > 0 && (
        <ScrollView
          contentContainerClassName="gap-3"
          horizontal
          showsHorizontalScrollIndicator={false}
          testID="adhkar-flow-strip"
        >
          {nextUp.map((item) => (
            <View
              className="w-40 shrink-0 justify-between gap-2 rounded-card border border-line bg-surface p-3"
              key={item.id}
              testID={`adhkar-flow-next-${item.id}`}
            >
              <Text className="text-meta text-ink text-start">{item.text}</Text>
              <Text className="self-start rounded-pill bg-now px-2 py-1 font-sans-bold text-chip text-gold">
                ×{toArabicIndic(item.repeat)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <AdhkarReference category={category} />
    </View>
  )
}

function AdhkarReference({ category }: { category: AdhkarCategory }) {
  const [referenceOpen, setReferenceOpen] = useState(false)
  const theme = useThemeColors()

  return (
    <View
      className="overflow-hidden rounded-card border border-line bg-surface"
      testID="adhkar-flow-reference-section"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: referenceOpen }}
        className="flex-row items-center justify-between gap-3 p-4"
        onPress={() => setReferenceOpen((previous) => !previous)}
        testID="adhkar-flow-reference-toggle"
      >
        <Text className="text-body text-ink">
          {ADHKAR_COPY.allSectionAdhkar} ({toArabicIndic(category.items.length)})
        </Text>
        {referenceOpen ? (
          <ChevronUp accessible={false} color={theme['mute']} size={ICON_SIZE} />
        ) : (
          <ChevronDown accessible={false} color={theme['mute']} size={ICON_SIZE} />
        )}
      </Pressable>
      {referenceOpen && (
        <View className="gap-3 px-4 pb-4" testID="adhkar-flow-reference">
          {category.items.map((item) => (
            <View
              className="gap-2 rounded-card border border-line bg-bg p-4"
              key={item.id}
              testID={`adhkar-flow-reference-item-${item.id}`}
            >
              <Text className="font-text text-daily-line text-ink text-start">{item.text}</Text>
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="text-meta text-gold">×{toArabicIndic(item.repeat)}</Text>
                {item.virtue && (
                  <Text className="text-meta text-ink text-start">{item.virtue}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
