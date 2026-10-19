import { DAILY_ADHKAR_CATEGORY } from '../content/daily-adhkar'
import { toDayId } from '../lib/day'
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

type PendingAction = Promise<void>

export function DailyAdhkarList() {
  const database = useSQLiteContext()
  const repository = useMemo(() => createDhikrCompletionRepository(database), [database])
  const [day, setDay] = useState<DayId>(() => toDayId(new Date()))
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [failedItems, setFailedItems] = useState<Record<string, boolean>>({})
  const countsRef = useRef<Record<string, number>>({})
  const dayRef = useRef(day)
  const attemptGenerations = useRef(new Map<string, number>())
  const pendingActions = useRef(new Map<string, PendingAction>())
  const { areas, isLoading, refresh } = useWirdChecklist(day)
  const checklistItems = useMemo(
    () => new Map(areas.flatMap((area) => area.items).map((item) => [item.id, item])),
    [areas],
  )

  const switchDay = useCallback((nextDay: DayId) => {
    dayRef.current = nextDay
    countsRef.current = {}
    setCounts({})
    setFailedItems({})
    attemptGenerations.current.forEach((generation, itemId) => {
      attemptGenerations.current.set(itemId, generation + 1)
    })
    setDay(nextDay)
  }, [])

  useFocusEffect(
    useCallback(() => {
      const focusedDay = toDayId(new Date())
      if (focusedDay !== day) {
        switchDay(focusedDay)
      }
      refresh()
      return undefined
    }, [day, refresh, switchDay]),
  )

  const reset = useCallback((itemId: string) => {
    const generation = attemptGenerations.current.get(itemId) ?? 0
    attemptGenerations.current.set(itemId, generation + 1)
    const next = { ...countsRef.current, [itemId]: 0 }
    countsRef.current = next
    setCounts(next)
    setFailedItems((current) => {
      if (!current[itemId]) return current
      const nextFailures = { ...current }
      delete nextFailures[itemId]
      return nextFailures
    })
  }, [])

  const tap = useCallback(
    (item: Dhikr, checklistItem: ChecklistItemView | undefined) => {
      if (isLoading) return undefined
      const tappedDay = toDayId(new Date())
      if (tappedDay !== day) {
        switchDay(tappedDay)
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
      setCounts(next)
      if (count < current.target || !checklistItem) return undefined

      const rollbackCount = current.target - 1
      const attemptGeneration = attemptGenerations.current.get(item.id) ?? 0
      attemptGenerations.current.set(item.id, attemptGeneration)
      const markFailed = () => {
        if (
          (attemptGenerations.current.get(item.id) ?? 0) !== attemptGeneration ||
          dayRef.current !== day
        )
          return
        const rolledBack = { ...countsRef.current, [item.id]: rollbackCount }
        countsRef.current = rolledBack
        setCounts(rolledBack)
        setFailedItems((currentFailures) => ({ ...currentFailures, [item.id]: true }))
      }
      const clearFailure = () => {
        setFailedItems((currentFailures) => {
          if (!currentFailures[item.id]) return currentFailures
          const nextFailures = { ...currentFailures }
          delete nextFailures[item.id]
          return nextFailures
        })
      }

      const previous = pendingActions.current.get(item.id) ?? Promise.resolve()
      const action = previous.then(async () => {
        const result = await repository.completeLinkedWirdItem(day, item.id, Date.now())
        if (result.ok) {
          clearFailure()
          refresh()
          return
        }
        markFailed()
        logger.error('Native daily adhkar completion was not saved', null, {
          itemId: item.id,
          day,
        })
      })
      const tracked = action
        .catch((cause: unknown) => {
          markFailed()
          logger.error('Native daily adhkar tap failed', cause, { itemId: item.id, day })
        })
        .finally(() => {
          if (pendingActions.current.get(item.id) === tracked)
            pendingActions.current.delete(item.id)
        })
      pendingActions.current.set(item.id, tracked)
      return tracked
    },
    [day, isLoading, refresh, repository, switchDay],
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
              className={`rounded-card border p-4 ${state.done ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
              disabled={disabled}
              onPress={() => tap(item, checklistItem)}
              testID={`adhkar-daily-card-${item.id}`}
            >
              <View className="gap-3">
                <Text className="font-scripture text-scripture text-start text-foreground">
                  {item.text}
                </Text>
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    className="font-display text-title text-primary"
                    testID={`adhkar-daily-progress-${item.id}`}
                  >
                    {toArabicIndic(state.count)}/{toArabicIndic(state.target)}
                  </Text>
                  {state.done && (
                    <Text className="text-small text-primary">{ADHKAR_COPY.done}</Text>
                  )}
                </View>
              </View>
            </Pressable>
            {failedItems[item.id] && (
              <Text accessibilityRole="alert" className="text-small text-start text-destructive">
                {ADHKAR_NATIVE_COPY.completionFailed}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center py-2"
              onPress={() => reset(item.id)}
              testID={`adhkar-daily-reset-${item.id}`}
            >
              <Text className="text-small text-muted-foreground text-start">
                {ADHKAR_COPY.reset}
              </Text>
            </Pressable>
          </View>
        )
      })}
    </View>
  )
}
