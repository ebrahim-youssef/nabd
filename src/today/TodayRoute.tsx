import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'

import { compareDayId, nextDay, previousDay } from '../lib/day'
import { Button } from '../ui/Button'
import { BlockCard } from '../ui/BlockCard'
import { ChecklistRow } from '../ui/ChecklistRow'
import { DayHeader } from '../ui/DayHeader'
import { Toast } from '../ui/Toast'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import type { DayId } from '../wird/types'
import type { DayPlanItem } from '../day-plan/types'
import { useToggleItem } from '../wird/useToggleItem'
import { TODAY_COPY } from './copy'
import { useTodayDayPlan } from './useTodayDayPlan'
import { toArabicIndic } from '../lib/format'
import { formatPrayerTime } from '../prayer-times/formatPrayerTime'

type ToastItem = { item: DayPlanItem; saved: boolean }

export function TodayRoute({ day }: { day: DayId }) {
  const today = useTodayDayPlan(day)
  const { plan } = today
  const { toggle, optimisticItems, getOptimisticDone } = useToggleItem(today.versionId, undefined, {
    day,
    plan,
  })
  const router = useRouter()
  const [toastItem, setToastItem] = useState<ToastItem | null>(null)
  const canGoNext = compareDayId(day, today.currentDay) < 0
  const canGoPrevious =
    today.earliestVersionDay !== null && compareDayId(day, today.earliestVersionDay) > 0

  const record = async (item: DayPlanItem, done: boolean) => {
    setToastItem(null)
    const wasSaved = await toggle(day, item.id, done, item.done)
    setToastItem(wasSaved ? (done ? { item, saved: true } : null) : { item, saved: false })
  }

  const undo = async () => {
    if (!toastItem?.saved) return
    const wasSaved = await toggle(day, toastItem.item.id, false)
    setToastItem(wasSaved ? null : { item: toastItem.item, saved: false })
  }

  const renderRows = (items: DayPlanItem[]) =>
    items.map((item, index) => (
      <View key={item.id}>
        <ChecklistRow
          done={optimisticItems?.get(`${day}:${item.id}`)?.done ?? item.done}
          first={index === 0}
          label={item.label}
          muteDone={false}
          onToggle={() => void record(item, !getOptimisticDone(day, item.id, item.done))}
          optional={item.optional}
          sub={item.minimum}
          testID={`today-row-${item.id}`}
        />
      </View>
    ))

  return (
    <View className="flex-1">
      <ScreenContainer fullBleed testID="today-screen">
        <View className="gap-3">
          <DayHeader
            day={day}
            onPrev={canGoPrevious ? () => router.push(`/today/${previousDay(day)}`) : undefined}
            onNext={canGoNext ? () => router.push(`/today/${nextDay(day)}`) : undefined}
            progress={
              today.status === 'ready'
                ? { done: plan.progress.done, required: plan.progress.required }
                : undefined
            }
          />
          {today.status === 'ready' ? (
            <View className="gap-3 px-6 pb-4">
              {plan.blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  meta={block.window ? formatPrayerTime(block.window.start) : undefined}
                  now={day === today.currentDay && block.isCurrent}
                  testID={`today-block-${block.id}`}
                  title={block.label}
                >
                  {renderRows(block.items)}
                </BlockCard>
              ))}

              {plan.timedActs
                .filter(({ items }) => items.length > 0)
                .map((act) => (
                  <BlockCard
                    key={act.id}
                    meta={
                      act.window
                        ? `${TODAY_COPY.until} ${formatPrayerTime(act.window.end)}`
                        : undefined
                    }
                    testID={`today-block-${act.id}`}
                    title={act.label}
                  >
                    {renderRows(act.items)}
                  </BlockCard>
                ))}

              {plan.anyTime.length > 0 ? (
                <BlockCard title={TODAY_COPY.anyTime}>{renderRows(plan.anyTime)}</BlockCard>
              ) : null}

              {plan.monthly.length > 0 ? (
                <BlockCard title={TODAY_COPY.monthly}>
                  {plan.monthly.map(({ item, progress }, index) => (
                    <View key={item.id}>
                      <ChecklistRow
                        done={optimisticItems?.get(`${day}:${item.id}`)?.done ?? item.done}
                        first={index === 0}
                        label={item.label}
                        muteDone={false}
                        onToggle={() =>
                          void record(item, !getOptimisticDone(day, item.id, item.done))
                        }
                        optional={item.optional}
                        sub={`${toArabicIndic(progress.done)} من ${toArabicIndic(progress.target)}`}
                        testID={`today-row-${item.id}`}
                      />
                    </View>
                  ))}
                </BlockCard>
              ) : null}
            </View>
          ) : today.status === 'failed' ? (
            <View className="gap-3 px-6 py-4">
              <Text className="text-center font-sans text-body text-mute">
                {TODAY_COPY.loadFailed}
              </Text>
              <Button label={TODAY_COPY.retry} onPress={today.refresh} />
            </View>
          ) : today.status === 'unavailable' ? (
            <View className="px-6 py-4">
              <Text className="text-center font-sans text-body text-mute">
                {TODAY_COPY.unavailable}
              </Text>
            </View>
          ) : null}
        </View>
      </ScreenContainer>

      {toastItem ? (
        <View className="absolute inset-x-4 bottom-[94px] z-50">
          <Toast
            message={
              toastItem.saved
                ? `${TODAY_COPY.recorded} ${toastItem.item.label}`
                : TODAY_COPY.saveFailed(toastItem.item.label)
            }
            onUndo={toastItem.saved ? undo : undefined}
            testID="today-toast"
          />
        </View>
      ) : null}
    </View>
  )
}
