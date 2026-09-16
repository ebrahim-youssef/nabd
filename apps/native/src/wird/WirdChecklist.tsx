import { areaProgress, toArabicIndic, WIRD_COPY } from '@nabd/shared'
import type { ChecklistAreaView, ChecklistItemView } from '@nabd/shared'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { DhikrCounter } from '../counter/DhikrCounter'
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
export function WirdChecklist() {
  const { day: initialDay, areas, isLoading, versionId, refresh } = useWirdDay()
  const { toggle, pendingItemIds, hasError } = useToggleItem(versionId, refresh)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  if (isLoading) return <View className="h-40 w-full rounded-card bg-surface-2" />
  if (!versionId || areas.length === 0) {
    return <Text className="text-body text-muted-foreground">{WIRD_COPY.empty}</Text>
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
        <Text accessibilityRole="alert" className="text-small text-destructive">
          {WIRD_COPY.toggleError}
        </Text>
      )}
      {areas.map((area) => {
        const isOpen = !collapsed.has(area.id)
        return (
          <View className="gap-2" key={area.id}>
            <AreaHeader area={area} isOpen={isOpen} onToggle={() => toggleArea(area.id)} />
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
            <Text className="text-title text-primary">{area.label}</Text>
            <Text className="text-small text-muted-foreground">{isOpen ? '⌄' : '⌃'}</Text>
          </View>
          <Text
            className={`rounded-chip border px-2 py-1 text-small ${
              complete
                ? 'border-gold bg-gold-soft text-gold'
                : 'border-border bg-surface text-muted-foreground'
            }`}
            testID={`${COUNT_TEST_PREFIX}${area.id}`}
          >
            {toArabicIndic(doneCount)}/{toArabicIndic(counted.length)}
          </Text>
        </View>
        <View className="h-1 overflow-hidden rounded-chip bg-border">
          <View
            className={complete ? 'h-full rounded-chip bg-gold' : 'h-full rounded-chip bg-accent'}
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
  onToggle,
}: {
  item: ChecklistItemView
  disabled: boolean
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
          item.done ? 'border-primary bg-primary/10' : 'border-border bg-surface'
        }`}
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-icon border-2 ${
            item.done ? 'border-primary bg-primary' : 'border-faint'
          }`}
        >
          {item.done && <Text className="text-body text-on-primary">{CHECKMARK}</Text>}
        </View>
        <View className="min-w-0 flex-1 items-start gap-0.5">
          <Text
            className={`text-body ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}
          >
            {item.label}
          </Text>
          {detail && (
            <Text className="text-small text-muted-foreground">
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
          <Text className="rounded-chip border border-primary bg-primary/10 px-2 py-1 text-label text-primary">
            {WIRD_COPY.targetToday}
          </Text>
        )}
        {item.optional && (
          <Text className="rounded-chip bg-gold-soft px-2 py-1 text-label text-gold">
            {WIRD_COPY.voluntary}
          </Text>
        )}
      </View>
    </Pressable>
  )
}
