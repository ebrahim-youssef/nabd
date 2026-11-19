import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'

import { compareDayId, nextDay, previousDay } from '../lib/day'
import { BlockCard } from '../ui/BlockCard'
import { ChecklistRow } from '../ui/ChecklistRow'
import { DayHeader } from '../ui/DayHeader'
import { Toast } from '../ui/Toast'
import { ScreenContainer } from '../shell/ScreenContainer'
import type { DayId } from '../wird/types'
import type { DayPlanItem } from '../day-plan/types'
import { useToggleItem } from '../wird/useToggleItem'
import { TODAY_COPY } from './copy'
import { useTodayDayPlan } from './useTodayDayPlan'
import { toArabicIndic } from '../lib/format'
import { formatPrayerTime } from '../prayer-times/formatPrayerTime'

type UndoItem = { item: DayPlanItem }

export function TodayRoute({ day }: { day: DayId }) {
  const today = useTodayDayPlan(day)
  const { plan } = today
  const { toggle } = useToggleItem(today.versionId, today.refresh)
  const router = useRouter()
  const [undoItem, setUndoItem] = useState<UndoItem | null>(null)
  const canGoNext = compareDayId(day, today.currentDay) < 0

  const record = (item: DayPlanItem, done: boolean) => {
    void toggle(day, item.id, done)
    setUndoItem(done ? { item } : null)
  }

  const undo = () => {
    if (!undoItem) return
    void toggle(day, undoItem.item.id, false)
    setUndoItem(null)
  }

  const renderRows = (items: DayPlanItem[]) =>
    items.map((item, index) => (
      <View key={item.id}>
        <ChecklistRow
          done={item.done}
          first={index === 0}
          label={item.label}
          muteDone={false}
          onToggle={() => record(item, !item.done)}
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
            onPrev={() => router.push(`/today/${previousDay(day)}`)}
            onNext={canGoNext ? () => router.push(`/today/${nextDay(day)}`) : undefined}
            progress={{ done: plan.progress.done, required: plan.progress.required }}
          />
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
                      done={item.done}
                      first={index === 0}
                      label={item.label}
                      muteDone={false}
                      onToggle={() => record(item, !item.done)}
                      optional={item.optional}
                      sub={`${toArabicIndic(progress.done)} من ${toArabicIndic(progress.target)}`}
                      testID={`today-row-${item.id}`}
                    />
                  </View>
                ))}
              </BlockCard>
            ) : null}
          </View>
        </View>
      </ScreenContainer>

      {undoItem ? (
        <View className="absolute inset-x-4 bottom-[94px] z-50">
          <Toast
            message={`${TODAY_COPY.recorded} ${undoItem.item.label}`}
            onUndo={undo}
            testID="today-toast"
          />
        </View>
      ) : null}
    </View>
  )
}
