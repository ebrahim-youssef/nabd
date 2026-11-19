import { toArabicIndic } from '../lib/format'
import { WIRD_COPY } from './copy'
import { areaProgress } from './logic'
import type { DayPrayerTimes } from '../prayer-times/logic'
import type { ChecklistAreaView, ChecklistItemView } from './types'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { DhikrCounter } from '../counter/DhikrCounter'
import { formatPrayerTime } from '../prayer-times/formatPrayerTime'
import { useTodayPrayerTimes } from '../prayer-times/useTodayPrayerTimes'
import { Text } from '../shell/Text'
import { useToggleItem } from './useToggleItem'
import { useWirdDay } from './WirdDayProvider'

const CHECKMARK = '✓'
const VALUE_SEPARATOR = ' · '
const CHECKLIST_TEST_ID = 'wird-checklist'
const ITEMS_TEST_PREFIX = 'area-items-'
const HEADER_TEST_PREFIX = 'area-header-'
const COUNT_TEST_PREFIX = 'area-count-'
const ITEM_TEST_PREFIX = 'wird-item-'
const MONTHLY_TEST_PREFIX = 'monthly-progress-'
const PRAYERS_AREA_ID = 'prayers'

function prayerTimeFor(times: DayPrayerTimes | null, itemId: string): number | undefined {
  if (!times || !(itemId in times)) return undefined
  return times[itemId as keyof DayPrayerTimes]
}

export function WirdChecklist() {
  const { day: initialDay, areas, isLoading, versionId, refresh } = useWirdDay()
  const { toggle, pendingItemIds, hasError } = useToggleItem(versionId, refresh)
  const { prayerStatus, times } = useTodayPrayerTimes()
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  if (isLoading && areas.length === 0) {
    return <View className="h-40 w-full rounded-card bg-bg" testID="wird-checklist-loading" />
  }
  if (!versionId || areas.length === 0) {
    return <Text className="text-body text-ink">{WIRD_COPY.empty}</Text>
  }

  function toggleArea(areaId: string) {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }

  return (
    <View className="gap-4" testID={CHECKLIST_TEST_ID}>
      {hasError && (
        <Text accessibilityRole="alert" className="text-meta text-gold-ink">
          {WIRD_COPY.toggleError}
        </Text>
      )}
      {areas.map((area) => {
        const isOpen = !collapsed.has(area.id)
        return (
          <View className="gap-2" key={area.id}>
            <AreaHeader area={area} isOpen={isOpen} onToggle={() => toggleArea(area.id)} />
            {area.id === PRAYERS_AREA_ID && prayerStatus ? (
              <Text className="text-body text-start text-accent" testID="prayer-status">
                {prayerStatus}
              </Text>
            ) : null}
            {isOpen && (
              <View className="gap-2" testID={`${ITEMS_TEST_PREFIX}${area.id}`}>
                {area.items.map((item) =>
                  item.kind === 'counter' && item.target ? (
                    <DhikrCounter
                      day={initialDay}
                      done={item.done}
                      itemId={item.id}
                      key={item.id}
                      label={item.label}
                      target={item.target}
                    />
                  ) : (
                    <ChecklistRow
                      disabled={pendingItemIds.has(item.id)}
                      item={item}
                      prayerTime={
                        area.id === PRAYERS_AREA_ID ? prayerTimeFor(times, item.id) : undefined
                      }
                      key={item.id}
                      onToggle={() => void toggle(initialDay, item.id, !item.done)}
                    />
                  ),
                )}
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

function AreaHeader({
  area,
  isOpen,
  onToggle,
}: {
  area: ChecklistAreaView
  isOpen: boolean
  onToggle: () => void
}) {
  const { counted, doneCount, complete, progress } = areaProgress(area)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
      onPress={onToggle}
      testID={`${HEADER_TEST_PREFIX}${area.id}`}
    >
      <View className="gap-2 py-1">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <Text className="font-display text-sheet-title text-accent">{area.label}</Text>
            <Text className="text-meta text-ink">{isOpen ? '⌄' : '⌃'}</Text>
          </View>
          <Text
            className={`rounded-pill border px-2 py-1 text-meta ${
              complete ? 'border-gold bg-now text-gold' : 'border-line bg-surface text-ink'
            }`}
            testID={`${COUNT_TEST_PREFIX}${area.id}`}
          >
            {toArabicIndic(doneCount)}/{toArabicIndic(counted.length)}
          </Text>
        </View>
        <View className="h-1 overflow-hidden rounded-pill bg-line">
          <View
            className={complete ? 'h-full rounded-pill bg-gold' : 'h-full rounded-pill bg-accent'}
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>
    </Pressable>
  )
}

function ChecklistRow({
  item,
  disabled,
  prayerTime,
  onToggle,
}: {
  item: ChecklistItemView
  disabled: boolean
  prayerTime?: number
  onToggle: () => void
}) {
  let detail = item.minimum || item.monthlyProgress
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ checked: item.done, disabled }}
      disabled={disabled}
      onPress={onToggle}
      testID={`${ITEM_TEST_PREFIX}${item.id}`}
    >
      <View
        className={`flex-row items-center gap-3 rounded-card border p-3 ${
          item.done ? 'border-accent bg-accent/10' : 'border-line bg-surface'
        }`}
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-pill border-2 ${
            item.done ? 'border-accent bg-accent' : 'border-mute'
          }`}
        >
          {item.done && <Text className="text-body text-on-accent">{CHECKMARK}</Text>}
        </View>
        <View className="min-w-0 flex-1 items-start gap-0.5">
          <Text className={`text-body ${item.done ? 'text-ink line-through' : 'text-ink'}`}>
            {item.label}
          </Text>
          {detail && (
            <Text className="text-meta text-ink">
              {item.minimum}
              {item.minimum && item.monthlyProgress && VALUE_SEPARATOR}
              {item.monthlyProgress && (
                <Text testID={`${MONTHLY_TEST_PREFIX}${item.id}`}>
                  {toArabicIndic(item.monthlyProgress.done)}/
                  {toArabicIndic(item.monthlyProgress.target)} {WIRD_COPY.monthlyProgress}
                </Text>
              )}
            </Text>
          )}
        </View>
        {item.targetToday && (
          <Text className="rounded-pill border border-accent bg-accent/10 px-2 py-1 font-sans-bold text-chip text-accent">
            {WIRD_COPY.targetToday}
          </Text>
        )}
        {item.optional && (
          <Text className="rounded-pill bg-now px-2 py-1 font-sans-bold text-chip text-gold">
            {WIRD_COPY.voluntary}
          </Text>
        )}
        {prayerTime !== undefined ? (
          <Text className="shrink-0 text-meta text-ink" testID={`prayer-time-${item.id}`}>
            {formatPrayerTime(prayerTime)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
