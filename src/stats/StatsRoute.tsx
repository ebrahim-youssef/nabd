import { toArabicIndic } from '../lib/format'
import { QADA_COPY } from '../qada/copy'
import { QADA_PRAYERS } from '../qada/logic'
import { shellCopy } from '../shell/copy'
import { STATS_COPY } from './copy'
import { bestStreak, currentStreak } from './logic'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { ItemStatsSection } from './ItemStatsSection'
import { completionPercent, formatArabicWeekday, formatCompletion } from './logic'
import { CHART_WINDOW_DAYS, STATS_WINDOW_DAYS, useStats } from './useStats'
const CHART_BAR_MIN_HEIGHT = 4

export function StatsRoute() {
  const router = useRouter()
  const { data, chartDays, error, exportRange, isLoading, refresh } = useStats()
  const current = currentStreak(data.completions)
  const best = bestStreak(data.completions)
  const qadaTotal = QADA_PRAYERS.reduce((total, prayer) => total + data.qada[prayer.id], 0)

  return (
    <ScreenContainer testID="stats-screen">
      <View className="gap-6">
        <PageHeader backHref="/" title={STATS_COPY.pageTitle} />
        {isLoading ? <View className="h-40 w-full rounded-card bg-bg" /> : null}
        {!isLoading && error ? (
          <View
            className="gap-4 rounded-card border border-line bg-surface p-4"
            testID="stats-error"
          >
            <Text className="text-body text-start text-accent">{shellCopy.error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shellCopy.retry}
              className="rounded-button bg-accent px-5 py-4"
              onPress={refresh}
              testID="stats-retry"
            >
              <Text className="text-body text-center font-sans-medium text-on-accent">
                {shellCopy.retry}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {!isLoading && !error ? (
          <>
            <View
              className="gap-3 rounded-card border border-line bg-surface p-4"
              testID="stats-streak-card"
            >
              <Text className="text-body text-ink">{STATS_COPY.streakSuffix}</Text>
              <Text
                className="font-display text-screen-title text-accent"
                testID="stats-current-streak"
              >
                {toArabicIndic(current)}
              </Text>
              <Text className="text-meta text-ink">{STATS_COPY.streakPrompt}</Text>
            </View>
            <View className="gap-3" testID="stats-week-chart">
              <Text className="font-display text-sheet-title text-accent">
                {STATS_COPY.completionTile}
              </Text>
              <View className="h-32 flex-row items-end justify-between gap-1 rounded-card border border-line bg-surface p-3">
                {chartDays.map((day) => {
                  const completion = data.completions.find((entry) => entry.day === day)
                  const percent = completion
                    ? completionPercent(completion.done, completion.total)
                    : 0
                  return (
                    <View
                      className="h-full min-w-0 flex-1 items-center justify-end gap-1"
                      key={day}
                    >
                      <View
                        className="w-full rounded-pill bg-accent"
                        style={{
                          height: `${Math.max(percent, completion ? CHART_BAR_MIN_HEIGHT : 0)}%`,
                        }}
                        testID={`stats-bar-${day}`}
                      />
                      <Text
                        className="min-w-0 max-w-full text-center text-meta text-ink"
                        ellipsizeMode="tail"
                        numberOfLines={1}
                      >
                        {formatArabicWeekday(day)}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <View className="gap-3" testID="stats-summary-card">
              <View className="flex-row items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
                <Text className="text-body text-ink">{STATS_COPY.completionTile}</Text>
                <Text className="font-display text-sheet-title text-accent" testID="stats-summary">
                  {formatCompletion(data.summary.done, data.summary.total)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
                <Text className="text-body text-ink">{STATS_COPY.bestStreakTile}</Text>
                <Text
                  className="font-display text-sheet-title text-accent"
                  testID="stats-best-streak"
                >
                  {toArabicIndic(best)}
                </Text>
              </View>
            </View>
            <View className="gap-3" testID="stats-today-areas">
              <Text className="font-display text-sheet-title text-accent">
                {STATS_COPY.todayDetail}
              </Text>
              {data.todayAreas.map((area) => (
                <View
                  className="flex-row items-center justify-between gap-3 rounded-card border border-line bg-surface p-4"
                  key={area.areaId}
                  testID={`stats-area-${area.areaId}`}
                >
                  <Text className="text-body text-ink">{area.label}</Text>
                  <Text className="text-body text-accent">
                    {formatCompletion(area.done, area.total)}
                  </Text>
                </View>
              ))}
            </View>
            <ItemStatsSection items={data.itemStats} />
            <Pressable
              accessibilityRole="button"
              className="gap-1 rounded-card border border-line bg-surface p-4"
              onPress={() => router.push('/qada')}
              testID="stats-qada-link"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-sans text-body text-accent">{QADA_COPY.pageTitle}</Text>
                <Text className="text-body text-accent">{toArabicIndic(qadaTotal)}</Text>
              </View>
              <Text className="text-meta text-ink">{QADA_COPY.statsDescription}</Text>
            </Pressable>
            <View className="gap-3" testID="stats-export">
              <Text className="font-sans-bold text-chip text-start text-ink">
                {STATS_COPY.exportData}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  className="rounded-button bg-bg px-3 py-2"
                  onPress={() => void exportRange(CHART_WINDOW_DAYS, 'week')}
                  testID="stats-export-week"
                >
                  <Text className="text-meta text-ink">{STATS_COPY.exportWeek}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="rounded-button bg-bg px-3 py-2"
                  onPress={() => void exportRange(STATS_WINDOW_DAYS, 'month')}
                  testID="stats-export-month"
                >
                  <Text className="text-meta text-ink">{STATS_COPY.exportMonth}</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </ScreenContainer>
  )
}
