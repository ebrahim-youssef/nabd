import { DAILY_ADHKAR_CATEGORY } from '../content/daily-adhkar'
import { toArabicIndic } from '../lib/format'
import { COPY as ADHKAR_COPY } from './copy'
import type { Dhikr } from '../content/adhkar'
import type { ChecklistItemView, DayId } from '../wird/types'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'

import { logger } from '../observability/logger'
import { Text } from '../shell/Text'
import { useWirdChecklist } from '../wird/useWirdChecklist'
import { createDhikrCompletionRepository } from '../counter/db'
import { ADHKAR_NATIVE_COPY } from './copy'
import { computeDailyItemState } from './logic'
import { useWirdToday } from '../day-plan/WirdTodayProvider'

type PendingAction = Promise<void>

export function DailyAdhkarList() {
  const database = useSQLiteContext()
  const repository = useMemo(() => createDhikrCompletionRepository(database), [database])
  const today = useWirdToday()
  const [progress, setProgress] = useState<{
    day: DayId
    counts: Record<string, number>
    failedItems: Record<string, boolean>
  }>({ day: today, counts: {}, failedItems: {} })
  const counts = progress.day === today ? progress.counts : {}
  const failedItems = progress.day === today ? progress.failedItems : {}
  const countsRef = useRef<Record<string, number>>({})
  const dayRef = useRef(today)
  const attemptGenerations = useRef(new Map<string, number>())
  const pendingActions = useRef(new Map<string, PendingAction>())
  const { areas, isLoading, refresh } = useWirdChecklist(today)
  const checklistItems = useMemo(
    () => new Map(areas.flatMap((area) => area.items).map((item) => [item.id, item])),
    [areas],
  )

  const switchDay = useCallback((nextDay: DayId) => {
    dayRef.current = nextDay
    countsRef.current = {}
    setProgress({ day: nextDay, counts: {}, failedItems: {} })
    attemptGenerations.current.forEach((generation, itemId) => {
      attemptGenerations.current.set(itemId, generation + 1)
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      const focusedDay = today
      if (focusedDay !== dayRef.current) {
        switchDay(focusedDay)
      }
      refresh()
      return undefined
    }, [refresh, switchDay, today]),
  )

  const reset = useCallback(
    (itemId: string) => {
      const generation = attemptGenerations.current.get(itemId) ?? 0
      attemptGenerations.current.set(itemId, generation + 1)
      const next = { ...countsRef.current, [itemId]: 0 }
      countsRef.current = next
      setProgress((current) => {
        const nextFailures = { ...(current.day === today ? current.failedItems : {}) }
        delete nextFailures[itemId]
        return { day: today, counts: next, failedItems: nextFailures }
      })
    },
    [today],
  )

  const tap = useCallback(
    (item: Dhikr, checklistItem: ChecklistItemView | undefined) => {
      if (isLoading) return undefined
      if (dayRef.current !== today) {
        switchDay(today)
        return undefined
      }
      const current = computeDailyItemState(
        countsRef.current[item.id],
        checklistItem?.target,
        checklistItem?.done,
        item.repeat,
      )
      if (current.done) return undefined

      const count = Math.min(current.count + 1, current.target)
      const next = { ...countsRef.current, [item.id]: count }
      countsRef.current = next
      setProgress((current) => ({
        day: today,
        counts: next,
        failedItems: current.day === today ? current.failedItems : {},
      }))
      if (count < current.target || !checklistItem) return undefined

      const rollbackCount = current.target - 1
      const attemptGeneration = attemptGenerations.current.get(item.id) ?? 0
      attemptGenerations.current.set(item.id, attemptGeneration)
      const markFailed = () => {
        if (
          (attemptGenerations.current.get(item.id) ?? 0) !== attemptGeneration ||
          dayRef.current !== today
        )
          return
        const rolledBack = { ...countsRef.current, [item.id]: rollbackCount }
        countsRef.current = rolledBack
        setProgress((current) => ({
          day: today,
          counts: rolledBack,
          failedItems: {
            ...(current.day === today ? current.failedItems : {}),
            [item.id]: true,
          },
        }))
      }
      const clearFailure = () => {
        setProgress((current) => {
          const currentFailures = current.day === today ? current.failedItems : {}
          if (!currentFailures[item.id]) return current
          const nextFailures = { ...currentFailures }
          delete nextFailures[item.id]
          return { day: today, counts: countsRef.current, failedItems: nextFailures }
        })
      }

      const previous = pendingActions.current.get(item.id) ?? Promise.resolve()
      const action = previous.then(async () => {
        const result = await repository.completeLinkedWirdItem(today, item.id, Date.now())
        if (result.ok) {
          clearFailure()
          refresh()
          return
        }
        markFailed()
        logger.error('Native daily adhkar completion was not saved', null, {
          itemId: item.id,
          day: today,
        })
      })
      const tracked = action
        .catch((cause: unknown) => {
          markFailed()
          logger.error('Native daily adhkar tap failed', cause, {
            itemId: item.id,
            day: today,
          })
        })
        .finally(() => {
          if (pendingActions.current.get(item.id) === tracked)
            pendingActions.current.delete(item.id)
        })
      pendingActions.current.set(item.id, tracked)
      return tracked
    },
    [isLoading, refresh, repository, switchDay, today],
  )

  return (
    <View className="gap-3" testID="adhkar-daily-list">
      {DAILY_ADHKAR_CATEGORY.items.map((item) => {
        const checklistItem = checklistItems.get(item.id)
        const state = computeDailyItemState(
          counts[item.id],
          checklistItem?.target,
          checklistItem?.done,
          item.repeat,
        )
        const disabled = state.done || isLoading

        return (
          <View className="gap-2" key={item.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ checked: state.done, disabled }}
              className={`rounded-card border p-4 ${state.done ? 'border-accent bg-accent/10' : 'border-line bg-surface'}`}
              disabled={disabled}
              onPress={() => tap(item, checklistItem)}
              testID={`adhkar-daily-card-${item.id}`}
            >
              <View className="gap-3">
                <Text className="font-text text-daily-line text-start text-ink">{item.text}</Text>
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    className="font-display text-sheet-title text-accent"
                    testID={`adhkar-daily-progress-${item.id}`}
                  >
                    {toArabicIndic(state.count)}/{toArabicIndic(state.target)}
                  </Text>
                  {state.done && <Text className="text-meta text-accent">{ADHKAR_COPY.done}</Text>}
                </View>
              </View>
            </Pressable>
            {failedItems[item.id] && (
              <Text accessibilityRole="alert" className="text-meta text-start text-gold-ink">
                {ADHKAR_NATIVE_COPY.completionFailed}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center py-2"
              onPress={() => reset(item.id)}
              testID={`adhkar-daily-reset-${item.id}`}
            >
              <Text className="text-meta text-ink text-start">{ADHKAR_COPY.reset}</Text>
            </Pressable>
          </View>
        )
      })}
    </View>
  )
}
