import { toArabicIndic } from '../lib/format'
import { STATS_COPY } from './copy'
import { ChevronDown } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import type { ItemStat } from './types'

import { ICON_SIZE, useThemeTokens } from '../../theme/palette'
import { Text } from '../shell/Text'
import { completionPercent, formatCompletion, formatPercentage, PERCENT } from './logic'

type ItemStatsSectionProps = {
  items: ItemStat[]
}

export function ItemStatsSection({ items }: ItemStatsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const theme = useThemeTokens()
  const title = `${STATS_COPY.itemStats} (${toArabicIndic(items.length)})`

  if (items.length === 0) return null

  return (
    <View
      className="gap-2 rounded-card border border-border bg-surface"
      testID="stats-item-section"
    >
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        className="flex-row items-center justify-between gap-3 p-4"
        onPress={() => setIsExpanded((expanded) => !expanded)}
        testID="stats-item-stats-toggle"
      >
        <Text className="min-w-0 flex-1 font-display text-title text-primary" numberOfLines={1}>
          {title}
        </Text>
        <ChevronDown
          accessible={false}
          color={theme.hex['muted-foreground']}
          size={ICON_SIZE}
          style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {isExpanded ? (
        <View className="gap-2 px-4 pb-4">
          {items.map((item) => (
            <ItemStatRow item={item} key={item.itemId} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function ItemStatRow({ item }: { item: ItemStat }) {
  const percent = completionPercent(item.doneDays, item.activeDays)
  const percentage = formatPercentage(percent)
  return (
    <View
      className="gap-1.5 rounded-card border border-border bg-surface-2 p-3"
      testID={`stats-item-${item.itemId}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 text-body text-foreground" numberOfLines={1}>
          {item.label}
        </Text>
        {item.optional ? (
          <Text className="shrink-0 rounded-chip bg-gold-soft px-2 py-0.5 text-label text-gold">
            {STATS_COPY.voluntary}
          </Text>
        ) : (
          <Text
            className="shrink-0 text-small font-body-medium text-primary"
            testID={`item-consistency-${item.itemId}`}
          >
            {percentage}
          </Text>
        )}
      </View>
      {item.optional ? (
        <Text className="text-small text-muted-foreground">
          {STATS_COPY.optionalStats(
            toArabicIndic(item.doneDays),
            toArabicIndic(item.longestStreak),
          )}
          {item.attainment && item.attainment.window > 0
            ? STATS_COPY.attainment(
                toArabicIndic(item.attainment.done),
                toArabicIndic(item.attainment.window),
              )
            : null}
        </Text>
      ) : (
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <Text className="text-small text-muted-foreground">
            {toArabicIndic(item.currentStreak)} {STATS_COPY.consecutive}
          </Text>
          <Text className="text-small text-muted-foreground" testID={`item-missed-${item.itemId}`}>
            {STATS_COPY.missed} {toArabicIndic(item.missedDays)}
            {item.currentMissStreak > 1
              ? ` (${toArabicIndic(item.currentMissStreak)} ${STATS_COPY.consecutive})`
              : null}
          </Text>
          <Text className="text-small text-muted-foreground">
            {formatCompletion(item.doneDays, item.activeDays)} {STATS_COPY.day}
          </Text>
        </View>
      )}
      {!item.optional ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: PERCENT, now: percent }}
          className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border"
          testID={`item-progress-${item.itemId}`}
        >
          <View className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </View>
      ) : null}
    </View>
  )
}
