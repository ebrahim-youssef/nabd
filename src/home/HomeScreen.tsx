import { useState } from 'react'
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'

import type { PersistedOnboarding } from '../onboarding/db'
import { formatPrayerTime } from '../prayer-times/formatPrayerTime'
import { toArabicIndic } from '../lib/format'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { useToggleItem } from '../wird/useToggleItem'
import { useChecklistCallbacks } from '../wird/useChecklistCallbacks'
import { BlockCard } from '../ui/BlockCard'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { ChecklistRow } from '../ui/ChecklistRow'
import { DailyLines } from '../ui/DailyLines'
import { HeroHeader } from '../ui/HeroHeader'
import { ProgressBar } from '../ui/ProgressBar'
import { Tile } from '../ui/Tile'
import { Toast } from '../ui/Toast'
import type { DayPlan, DayPlanItem, DayPlanTimedAct } from '../day-plan/types'
import { HOME_COPY } from './copy'
import { useHomeDayPlan } from './useHomeDayPlan'

type OpenSheet = 'unrecorded' | 'any-time' | null
type ToastRecord = { item: DayPlanItem; sheet: OpenSheet; saved: boolean }

export function HomeScreen({ persisted }: { persisted: PersistedOnboarding }) {
  const home = useHomeDayPlan(persisted)
  const { plan } = home
  const { toggle, optimisticItems, getOptimisticDone } = useToggleItem(home.versionId, undefined, {
    day: home.day,
    revision: home.observation,
  })
  const router = useRouter()
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null)
  const [toastRecord, setToastRecord] = useState<ToastRecord | null>(null)
  const currentBlock = plan.currentBlock ?? plan.nextBlock
  const dateLabel = formatHeaderDate(home.day, plan.header?.mode)
  const unrecordedGroups = home.status === 'ready' ? buildUnrecordedGroups(plan) : []

  const record = async (item: DayPlanItem, done: boolean, sheet: OpenSheet = null) => {
    const wasSaved = await toggle(home.day, item.id, done, item.done)
    if (!wasSaved) {
      setToastRecord({ item, sheet, saved: false })
      return
    }
    setToastRecord(done ? { item, sheet, saved: true } : null)
  }
  const getOnToggle = useChecklistCallbacks<Exclude<OpenSheet, null>>((item, sheet) => {
    void record(item, !getOptimisticDone(home.day, item.id, item.done), sheet)
  })

  const undo = async () => {
    if (!toastRecord?.saved) return
    const wasSaved = await toggle(home.day, toastRecord.item.id, false)
    setToastRecord(wasSaved ? null : { ...toastRecord, saved: false })
  }

  const goToToday = () => {
    setOpenSheet(null)
    router.push(`/today/${home.day}`)
  }

  const openPrayerActionReview = async () => {
    const review = home.prayerActionReview
    if (!review) return
    await home.markPrayerActionReviewSeen(review.actionId)
    router.push(`/today/${review.day}`)
  }

  const renderItem = (item: DayPlanItem, sub?: string, sheet: OpenSheet = null, first = false) => (
    <ChecklistRow
      done={optimisticItems?.get(`${home.day}:${item.id}`)?.done ?? item.done}
      first={first}
      label={item.label}
      onToggle={getOnToggle(item, sheet)}
      optional={item.optional}
      sub={sub ?? item.minimum}
      testID={sheet ? `sheet-row-${item.id}` : `home-row-${item.id}`}
    />
  )

  const timedActCards = plan.openTimedActs.map((act) =>
    renderTimedAct(act, (item, sub, first) => renderItem(item, sub, null, first)),
  )
  const anyTimeQuran =
    home.status === 'ready' ? plan.anyTime.filter((item) => item.id.startsWith('quran')) : []
  const anyTimeDhikr =
    home.status === 'ready' ? plan.anyTime.filter((item) => item.kind === 'counter') : []
  const anyTimeFooter = (
    <View className="gap-3">
      <Pressable accessibilityRole="link" onPress={() => router.push('/adhkar')}>
        <Text className="text-center font-sans-medium text-body text-gold-ink">
          {HOME_COPY.counterLink}
        </Text>
      </Pressable>
      <Button label={HOME_COPY.today} onPress={goToToday} />
    </View>
  )

  return (
    <View className="flex-1">
      <ScreenContainer fullBleed testID="home-shell">
        <View>
          <HeroHeader
            currentPrayer={currentBlock?.label}
            dateLabel={dateLabel}
            header={plan.header}
            noLocationPrompt={HOME_COPY.noLocation}
            now={home.now}
            nextFajr={home.nextFajr}
            progress={home.status === 'ready' ? plan.progress : undefined}
            times={home.times}
          />
          {!plan.hasTimes ? (
            <View className="gap-2 px-6 pt-3">
              <Button
                label={HOME_COPY.setLocation}
                onPress={() => void home.runLocationAction()}
                variant="solid"
              />
              <Button label={HOME_COPY.today} onPress={goToToday} />
            </View>
          ) : null}
          <View className="gap-3 px-6 pt-4">
            <DailyLines dhikr={home.dailyLines.dhikr.text} intention={home.dailyLines.intention} />

            {home.prayerActionReview ? (
              <Pressable
                accessibilityRole="link"
                className="py-3.5"
                onPress={() => void openPrayerActionReview()}
                testID="prayer-action-review"
              >
                <Text className="text-start font-sans text-caption text-mute">
                  {HOME_COPY.prayerActionReview}
                </Text>
              </Pressable>
            ) : null}

            {home.status === 'failed' ? (
              <View className="gap-3 py-4">
                <Text className="text-center font-sans text-body text-mute">
                  {HOME_COPY.loadFailed}
                </Text>
                <Button label={HOME_COPY.retry} onPress={home.refresh} />
              </View>
            ) : null}

            {home.status === 'ready' && currentBlock ? (
              <BlockCard
                meta={
                  currentBlock === plan.currentBlock && currentBlock.window
                    ? formatPrayerTime(currentBlock.window.start)
                    : currentBlock.window
                      ? `${HOME_COPY.startsAt} ${formatPrayerTime(currentBlock.window.start)}`
                      : undefined
                }
                now={currentBlock === plan.currentBlock}
                testID="current-block"
                titleTestID="current-block-title"
                title={currentBlock.label}
              >
                {currentBlock.items.map((item, index) => (
                  <View key={item.id}>{renderItem(item, undefined, null, index === 0)}</View>
                ))}
              </BlockCard>
            ) : null}

            {home.status === 'ready' ? timedActCards : null}

            {home.status === 'ready' ? (
              <View className="flex-row gap-2.5">
                <Tile
                  count={
                    plan.unrecorded.length > 0 ? toArabicIndic(plan.unrecorded.length) : undefined
                  }
                  onPress={() => setOpenSheet('unrecorded')}
                  quiet={plan.unrecorded.length === 0}
                  sub={
                    plan.unrecorded.length > 0
                      ? HOME_COPY.fromFajrToday
                      : HOME_COPY.nothingUnrecorded
                  }
                  title={HOME_COPY.unrecorded}
                />
                <Tile
                  count={`${toArabicIndic(plan.anyTimeProgress.done)}/${toArabicIndic(
                    plan.anyTimeProgress.total,
                  )}`}
                  onPress={() => setOpenSheet('any-time')}
                  sub={HOME_COPY.anytimeShort}
                  title={HOME_COPY.anyTime}
                />
              </View>
            ) : null}

            {home.status === 'ready' ? (
              <ProgressBar done={plan.progress.done} total={plan.progress.required} />
            ) : null}
          </View>
        </View>
      </ScreenContainer>

      {toastRecord && toastRecord.sheet === null ? (
        <View className="absolute inset-x-4 bottom-[94px] z-50">
          <Toast
            message={
              toastRecord.saved
                ? `${HOME_COPY.recorded} ${toastRecord.item.label}`
                : HOME_COPY.saveFailed(toastRecord.item.label)
            }
            onUndo={toastRecord.saved ? undo : undefined}
            testID="home-toast"
          />
        </View>
      ) : null}

      <BottomSheet
        explanation={HOME_COPY.unrecordedExplanation}
        footer={<Button label={HOME_COPY.today} onPress={goToToday} />}
        onClose={() => setOpenSheet(null)}
        title={HOME_COPY.unrecorded}
        visible={openSheet === 'unrecorded'}
      >
        {unrecordedGroups.map((group) => (
          <BlockCard key={group.id} meta={group.meta} shadow={false} title={group.title}>
            {group.items.map((item, index) => (
              <View key={item.id} testID="unrecorded-row">
                {renderItem(item, undefined, 'unrecorded', index === 0)}
              </View>
            ))}
          </BlockCard>
        ))}
        {toastRecord?.sheet === 'unrecorded' ? (
          <Toast
            message={
              toastRecord.saved
                ? `${HOME_COPY.recorded} ${toastRecord.item.label}`
                : HOME_COPY.saveFailed(toastRecord.item.label)
            }
            onUndo={toastRecord.saved ? undo : undefined}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        explanation={HOME_COPY.anyTimeExplanation}
        footer={anyTimeFooter}
        onClose={() => setOpenSheet(null)}
        title={HOME_COPY.anyTime}
        visible={openSheet === 'any-time'}
      >
        {anyTimeQuran.length > 0 ? (
          <BlockCard shadow={false} title={HOME_COPY.quran}>
            {anyTimeQuran.map((item, index) => (
              <View key={item.id}>{renderItem(item, undefined, 'any-time', index === 0)}</View>
            ))}
          </BlockCard>
        ) : null}
        {anyTimeDhikr.length > 0 ? (
          <BlockCard shadow={false} title={HOME_COPY.adhkar}>
            {anyTimeDhikr.map((item, index) => (
              <View key={item.id}>
                {renderItem(
                  item,
                  item.target
                    ? `${toArabicIndic(item.target)} ${HOME_COPY.repetitions}`
                    : undefined,
                  'any-time',
                  index === 0,
                )}
              </View>
            ))}
          </BlockCard>
        ) : null}
        {toastRecord?.sheet === 'any-time' ? (
          <Toast
            message={
              toastRecord.saved
                ? `${HOME_COPY.recorded} ${toastRecord.item.label}`
                : HOME_COPY.saveFailed(toastRecord.item.label)
            }
            onUndo={toastRecord.saved ? undo : undefined}
          />
        ) : null}
      </BottomSheet>
    </View>
  )
}

function renderTimedAct(
  act: DayPlanTimedAct,
  renderItem: (item: DayPlanItem, sub: string | undefined, first: boolean) => ReactNode,
) {
  if (act.items.length === 0) return null
  const end = act.window?.end
  return (
    <BlockCard
      key={act.id}
      meta={end ? `${HOME_COPY.until} ${formatPrayerTime(end)}` : undefined}
      testID={`timed-act-${act.id}`}
      title={act.label}
    >
      {act.items.map((item, index) => (
        <View key={item.id}>{renderItem(item, undefined, index === 0)}</View>
      ))}
    </BlockCard>
  )
}

function formatHeaderDate(day: string, mode: 'day' | 'night' | undefined): string {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  const dayDate = new Date(year, month - MONTH_INDEX_OFFSET, dayOfMonth, DATE_LABEL_NOON_HOUR)
  if (mode === 'night') {
    const nightDate = new Date(
      year,
      month - MONTH_INDEX_OFFSET,
      dayOfMonth + NEXT_CALENDAR_DAY_OFFSET,
      DATE_LABEL_NOON_HOUR,
    )
    const weekDay = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(nightDate)
    return `${HOME_COPY.nightOf} ${weekDay}`
  }
  return new Intl.DateTimeFormat('ar-EG-u-ca-islamic-umalqura', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(dayDate)
}

function buildUnrecordedGroups(plan: DayPlan) {
  const unrecordedIds = new Set(plan.unrecorded.map(({ id }) => id))
  return [
    ...plan.blocks.map((block) => ({
      id: block.id,
      title: block.label,
      meta: block.window ? formatPrayerTime(block.window.start) : undefined,
      items: block.items.filter(({ id }) => unrecordedIds.has(id)),
    })),
    ...plan.timedActs.map((act) => ({
      id: act.id,
      title: act.label,
      meta: act.window ? `${HOME_COPY.until} ${formatPrayerTime(act.window.end)}` : undefined,
      items: act.items.filter(({ id }) => unrecordedIds.has(id)),
    })),
  ].filter(({ items }) => items.length > 0)
}

const MONTH_INDEX_OFFSET = 1
const NEXT_CALENDAR_DAY_OFFSET = 1
const DATE_LABEL_NOON_HOUR = 12
