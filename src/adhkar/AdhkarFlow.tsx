import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native'
import { toArabicIndic } from '../lib/format'
import { COPY as ADHKAR_COPY, STRIP_VISIBLE_COUNT } from './copy'
import { upcoming } from './logic'
import type { AdhkarCategory } from '../content/adhkar'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { ICON_SIZE, useThemeTokens } from '../../theme/palette'
import { Text } from '../shell/Text'
import { useAdhkarFlow } from './useAdhkarFlow'

const PERCENTAGE_MAX = 100

export function AdhkarFlow({ category }: { category: AdhkarCategory }) {
  const { state, tap, restart, markedInWird } = useAdhkarFlow(category.id, category.items)
  const theme = useThemeTokens()

  if (state.finished) {
    return (
      <View className="gap-4">
        <View
          className="items-center gap-3 rounded-card bg-primary p-6"
          testID={`adhkar-flow-${category.id}`}
        >
          <Text className="text-body text-on-primary">{ADHKAR_COPY.finished}</Text>
          {markedInWird && (
            <Text className="text-small text-on-primary">{ADHKAR_COPY.markedInWird}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-2 rounded-button border border-on-primary px-4 py-2"
            onPress={restart}
            testID={`adhkar-restart-${category.id}`}
          >
            <RotateCcw accessible={false} color={theme.hex['on-primary']} size={ICON_SIZE} />
            <Text className="text-small text-on-primary">{ADHKAR_COPY.restart}</Text>
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
        className="items-center gap-4 rounded-card bg-primary p-6"
        onPress={tap}
        testID={`adhkar-active-${category.id}`}
      >
        <Text className="font-scripture text-scripture text-on-primary text-start">
          {active.text}
        </Text>
        <Text className="font-display text-display text-on-primary" testID="adhkar-flow-count">
          {toArabicIndic(state.count)}/{toArabicIndic(active.repeat)}
        </Text>
        <View
          accessible={false}
          className="h-1 w-full overflow-hidden rounded-chip bg-ring-track"
          testID={`adhkar-flow-track-${active.id}`}
        >
          <View className="h-full rounded-chip bg-gold" style={{ width: `${progress}%` }} />
        </View>
        <Text className="text-small text-on-primary">{ADHKAR_COPY.tapHint}</Text>
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
              className="w-40 shrink-0 justify-between gap-2 rounded-card border border-border bg-surface p-3"
              key={item.id}
              testID={`adhkar-flow-next-${item.id}`}
            >
              <Text className="text-small text-muted-foreground text-start">{item.text}</Text>
              <Text className="self-start rounded-chip bg-gold-soft px-2 py-1 text-label text-gold">
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
  const theme = useThemeTokens()

  return (
    <View
      className="overflow-hidden rounded-card border border-border bg-surface"
      testID="adhkar-flow-reference-section"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: referenceOpen }}
        className="flex-row items-center justify-between gap-3 p-4"
        onPress={() => setReferenceOpen((previous) => !previous)}
        testID="adhkar-flow-reference-toggle"
      >
        <Text className="text-body text-foreground">
          {ADHKAR_COPY.allSectionAdhkar} ({toArabicIndic(category.items.length)})
        </Text>
        {referenceOpen ? (
          <ChevronUp accessible={false} color={theme.hex['muted-foreground']} size={ICON_SIZE} />
        ) : (
          <ChevronDown accessible={false} color={theme.hex['muted-foreground']} size={ICON_SIZE} />
        )}
      </Pressable>
      {referenceOpen && (
        <View className="gap-3 px-4 pb-4" testID="adhkar-flow-reference">
          {category.items.map((item) => (
            <View
              className="gap-2 rounded-card border border-border bg-surface-2 p-4"
              key={item.id}
              testID={`adhkar-flow-reference-item-${item.id}`}
            >
              <Text className="font-scripture text-scripture text-foreground text-start">
                {item.text}
              </Text>
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="text-small text-gold">×{toArabicIndic(item.repeat)}</Text>
                {item.virtue && (
                  <Text className="text-small text-muted-foreground text-start">{item.virtue}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
