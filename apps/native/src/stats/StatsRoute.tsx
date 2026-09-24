import {
  bestStreak,
  currentStreak,
  QADA_COPY,
  QADA_PRAYERS,
  shellCopy,
  STATS_COPY,
  toArabicIndic,
} from '@nabd/shared'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { CHART_WINDOW_DAYS, STATS_WINDOW_DAYS, useStats } from './useStats'

const PERCENT = 100
const CHART_BAR_MIN_HEIGHT = 4

function completionPercent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * PERCENT) : 0
}

function formatCompletion(done: number, total: number): string {
  return `${toArabicIndic(done)}/${toArabicIndic(total)}`
}

export function StatsRoute() {
  const router = useRouter()
  const { data, chartDays, exportRange, isLoading } = useStats()
  const current = currentStreak(data.completions)
  const best = bestStreak(data.completions)
  const qadaTotal = QADA_PRAYERS.reduce((total, prayer) => total + data.qada[prayer.id], 0)

  return (
    <ScreenContainer testID="stats-screen">
      <View className="gap-6">
        <PageHeader backHref="/" title={shellCopy.nav.stats} />
        {isLoading ? <View className="h-40 w-full rounded-card bg-surface-2" /> : null}
        {!isLoading ? (
          <>
            <View
              className="gap-3 rounded-card border border-border bg-surface p-4"
              testID="stats-streak-card"
            >
              <Text className="text-body text-muted-foreground">{STATS_COPY.streakSuffix}</Text>
              <Text
                className="font-display text-display text-primary"
                testID="stats-current-streak"
              >
                {toArabicIndic(current)}
              </Text>
              <Text className="text-small text-muted-foreground">{STATS_COPY.streakPrompt}</Text>
            </View>
            <View className="gap-3" testID="stats-week-chart">
              <Text className="font-display text-title text-primary">
                {STATS_COPY.completionTile}
              </Text>
              <View className="h-32 flex-row items-end justify-between gap-1 rounded-card border border-border bg-surface p-3">
                {chartDays.map((day) => {
                  const completion = data.completions.find((entry) => entry.day === day)
                  const percent = completion
                    ? completionPercent(completion.done, completion.total)
                    : 0
                  return (
                    <View className="h-full flex-1 items-center justify-end gap-1" key={day}>
                      <View
                        className="w-full rounded-chip bg-primary"
                        style={{
                          height: `${Math.max(percent, completion ? CHART_BAR_MIN_HEIGHT : 0)}%`,
                        }}
                        testID={`stats-bar-${day}`}
                      />
                      <Text className="text-small text-muted-foreground">{day.slice(8)}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <View className="gap-3" testID="stats-summary-card">
              <View className="flex-row items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
                <Text className="text-body text-foreground">{STATS_COPY.completionTile}</Text>
                <Text className="font-display text-title text-primary" testID="stats-summary">
                  {formatCompletion(data.summary.done, data.summary.total)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
                <Text className="text-body text-foreground">{STATS_COPY.bestStreakTile}</Text>
                <Text className="font-display text-title text-primary" testID="stats-best-streak">
                  {toArabicIndic(best)}
                </Text>
              </View>
            </View>
            <View className="gap-3" testID="stats-today-areas">
              <Text className="font-display text-title text-primary">{STATS_COPY.todayDetail}</Text>
              {data.todayAreas.map((area) => (
                <View
                  className="flex-row items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
                  key={area.areaId}
                  testID={`stats-area-${area.areaId}`}
                >
                  <Text className="text-body text-foreground">{area.label}</Text>
                  <Text className="text-body text-primary">
                    {formatCompletion(area.done, area.total)}
                  </Text>
                </View>
              ))}
            </View>
            <View className="gap-3" testID="stats-items">
              <Text className="font-display text-title text-primary">{STATS_COPY.itemStats}</Text>
              {data.itemStats.map((item) => (
                <View
                  className="flex-row items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
                  key={item.itemId}
                  testID={`stats-item-${item.itemId}`}
                >
                  <Text className="min-w-0 flex-1 text-body text-foreground">{item.label}</Text>
                  <Text className="text-small text-primary">
                    {formatCompletion(item.doneDays, item.activeDays)}
                  </Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              className="gap-1 rounded-card border border-border bg-surface p-4"
              onPress={() => router.push('/qada')}
              testID="stats-qada-link"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-display text-body text-primary">{QADA_COPY.pageTitle}</Text>
                <Text className="text-body text-primary">{toArabicIndic(qadaTotal)}</Text>
              </View>
              <Text className="text-small text-muted-foreground">{QADA_COPY.statsDescription}</Text>
            </Pressable>
            <View className="gap-3" testID="stats-export">
              <Text className="text-label text-start text-muted-foreground">
                {STATS_COPY.exportData}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  className="rounded-button bg-surface-2 px-3 py-2"
                  onPress={() => void exportRange(CHART_WINDOW_DAYS, 'week')}
                  testID="stats-export-week"
                >
                  <Text className="text-small text-foreground">{STATS_COPY.exportWeek}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="rounded-button bg-surface-2 px-3 py-2"
                  onPress={() => void exportRange(STATS_WINDOW_DAYS, 'month')}
                  testID="stats-export-month"
                >
                  <Text className="text-small text-foreground">{STATS_COPY.exportMonth}</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </ScreenContainer>
  )
}
