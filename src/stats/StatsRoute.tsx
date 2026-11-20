import { useRouter } from 'expo-router'
import { View } from 'react-native'

import { toArabicIndic } from '../lib/format'
import { formatQadaCount, formatStreak } from '../more/copy'
import { QADA_PRAYERS } from '../qada/logic'
import { shellCopy } from '../shell/copy'
import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { SectionHeader } from '../ui/SectionHeader'
import { StateView } from '../ui/StateView'
import { StatTile } from '../ui/StatTile'
import { WeekBars } from '../ui/WeekBars'
import { STATS_COPY, formatWeekSummary } from './copy'
import { ItemStatsSection } from './ItemStatsSection'
import {
  bestStreak,
  completionPercent,
  currentStreak,
  formatArabicWeekday,
  formatPercentage,
} from './logic'
import { CHART_WINDOW_DAYS, STATS_WINDOW_DAYS, useStats } from './useStats'

export function StatsRoute() {
  const router = useRouter()
  const { data, chartDays, error, exportRange, isLoading, refresh } = useStats()
  const today = chartDays[chartDays.length - 1]
  const todayCompletion = data.completions.find((entry) => entry.day === today)
  const todayPercent = todayCompletion
    ? completionPercent(todayCompletion.done, todayCompletion.total)
    : 0
  const weekCompletions = data.completions.filter((entry) => chartDays.includes(entry.day))
  const completedDays = weekCompletions.filter(
    (entry) => entry.total > 0 && entry.done === entry.total,
  ).length
  const weekSummary = formatWeekSummary(completedDays, todayPercent)
  const bars = chartDays.map((day) => {
    const completion = weekCompletions.find((entry) => entry.day === day)
    return {
      label: day === today ? STATS_COPY.today : formatArabicWeekday(day),
      ratio: completion ? completionPercent(completion.done, completion.total) / 100 : 0,
      isToday: day === today,
    }
  })
  const current = currentStreak(data.completions)
  const best = bestStreak(data.completions)
  const qadaTotal = QADA_PRAYERS.reduce((total, prayer) => total + data.qada[prayer.id], 0)

  return (
    <ScreenContainer testID="stats-screen">
      <View className="gap-6">
        <PageHeader backHref="/more" directBack title={STATS_COPY.pageTitle} />
        {isLoading ? <StateView kind="loading" /> : null}
        {!isLoading && error ? (
          <StateView
            kind="error"
            title={shellCopy.error}
            action={{ label: shellCopy.retry, onPress: refresh }}
          />
        ) : null}
        {!isLoading && !error && !data.hasHistory ? (
          <StateView
            kind="empty"
            title={STATS_COPY.emptyTitle}
            body={STATS_COPY.emptyBody}
            action={{ label: STATS_COPY.openToday, onPress: () => router.push('/today') }}
          />
        ) : null}
        {!isLoading && !error && data.hasHistory ? (
          <>
            <View className="gap-2 rounded-card border border-line bg-surface p-4">
              <Text className="font-display text-screen-title text-accent">
                {formatStreak(current) ?? STATS_COPY.streakStart}
              </Text>
              {best > 0 ? (
                <Text className="text-meta text-mute">{STATS_COPY.best(toArabicIndic(best))}</Text>
              ) : null}
              {todayPercent < 100 ? (
                <Text className="text-meta text-ink">{STATS_COPY.streakPrompt}</Text>
              ) : null}
            </View>
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <SectionHeader title={STATS_COPY.weekTitle} />
                <Text className="text-meta text-mute">
                  {STATS_COPY.countOf(
                    toArabicIndic(completedDays),
                    toArabicIndic(CHART_WINDOW_DAYS),
                  )}
                </Text>
              </View>
              <WeekBars days={bars} summary={weekSummary} />
              <Text className="text-meta text-mute">
                {weekSummary.split(formatPercentage(todayPercent))[0]}
                <Text style={{ direction: 'ltr' }}>{formatPercentage(todayPercent)}</Text>
                {weekSummary.split(formatPercentage(todayPercent))[1]}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <StatTile
                  label={STATS_COPY.lastMonth}
                  value={formatPercentage(
                    completionPercent(data.summary.completedDays, data.summary.days),
                  )}
                  valueDirection="ltr"
                  caption={STATS_COPY.completedDays}
                />
              </View>
              <View className="flex-1">
                <StatTile
                  label={STATS_COPY.qada}
                  value={formatQadaCount(qadaTotal)}
                  caption={STATS_COPY.openLedger}
                  onPress={() => router.push('/qada')}
                />
              </View>
            </View>
            <View className="gap-3">
              <SectionHeader title={STATS_COPY.todayDetail} />
              <ListGroup>
                {data.todayAreas.map((area) => (
                  <ListRow
                    key={area.areaId}
                    label={area.label}
                    value={STATS_COPY.countOf(toArabicIndic(area.done), toArabicIndic(area.total))}
                  />
                ))}
              </ListGroup>
            </View>
            <ItemStatsSection items={data.itemStats} />
            <View className="gap-3">
              <SectionHeader title={STATS_COPY.exportData} />
              <ListGroup>
                <ListRow
                  label={STATS_COPY.exportWeek}
                  onPress={() => void exportRange(CHART_WINDOW_DAYS, 'week')}
                />
                <ListRow
                  label={STATS_COPY.exportMonth}
                  onPress={() => void exportRange(STATS_WINDOW_DAYS, 'month')}
                />
              </ListGroup>
            </View>
          </>
        ) : null}
      </View>
    </ScreenContainer>
  )
}
