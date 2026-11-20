import { toArabicIndic } from '../lib/format'
import { STATS_COPY } from './copy'
import { useState } from 'react'
import { View } from 'react-native'
import type { ItemStat } from './types'

import { Accordion } from '../ui/Accordion'
import { Text } from '../shell/Text'
import { completionPercent, formatCompletion, formatPercentage, PERCENT } from './logic'

type ItemStatsSectionProps = {
  items: ItemStat[]
}

export function ItemStatsSection({ items }: ItemStatsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const title = `${STATS_COPY.itemStats} (${toArabicIndic(items.length)})`

  if (items.length === 0) return null

  return (
    <Accordion
      title={title}
      subtitle={STATS_COPY.itemSubtitle}
      expanded={isExpanded}
      onToggle={() => setIsExpanded((expanded) => !expanded)}
      testID="stats-item-section"
    >
      <View className="gap-2 py-4">
        {items.map((item) => (
          <ItemStatRow item={item} key={item.itemId} />
        ))}
      </View>
    </Accordion>
  )
}

function ItemStatRow({ item }: { item: ItemStat }) {
  const percent = completionPercent(item.doneDays, item.activeDays)
  const percentage = formatPercentage(percent)
  return (
    <View
      className="gap-1.5 rounded-card border border-line bg-bg p-3"
      testID={`stats-item-${item.itemId}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 text-body text-ink" numberOfLines={1}>
          {item.label}
        </Text>
        {item.optional ? (
          <Text className="shrink-0 rounded-pill bg-now px-2 py-0.5 font-sans-bold text-chip text-gold-ink">
            {STATS_COPY.voluntary}
          </Text>
        ) : (
          <Text
            className="shrink-0 text-meta font-sans-medium text-accent"
            style={{ direction: 'ltr' }}
            testID={`item-consistency-${item.itemId}`}
          >
            {percentage}
          </Text>
        )}
      </View>
      {item.optional ? (
        <Text className="text-meta text-ink">
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
          <Text className="text-meta text-ink">
            {toArabicIndic(item.currentStreak)} {STATS_COPY.consecutive}
          </Text>
          <Text className="text-meta text-ink" testID={`item-missed-${item.itemId}`}>
            {STATS_COPY.missed} {toArabicIndic(item.missedDays)}
            {item.currentMissStreak > 1
              ? ` (${toArabicIndic(item.currentMissStreak)} ${STATS_COPY.consecutive})`
              : null}
          </Text>
          <Text className="text-meta text-ink">
            {formatCompletion(item.doneDays, item.activeDays)} {STATS_COPY.day}
          </Text>
        </View>
      )}
      {!item.optional ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: PERCENT, now: percent }}
          className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line"
          testID={`item-progress-${item.itemId}`}
        >
          <View className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </View>
      ) : null}
    </View>
  )
}
