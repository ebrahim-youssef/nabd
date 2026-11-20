import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Vibration, View } from 'react-native'

import type { AdhkarCategory } from '../content/adhkar'
import { useWirdToday } from '../day-plan/WirdTodayProvider'
import { toArabicIndic } from '../lib/format'
import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { Accordion } from '../ui/Accordion'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { StateView } from '../ui/StateView'
import { ADHKAR_NATIVE_COPY, COPY, DAILY_CATEGORY_ID, ONCE_DAILY_CATEGORIES } from './copy'
import { computeDailyItemState } from './logic'
import { useAdhkarFlow } from './useAdhkarFlow'
import { useDailyAdhkarProgress } from './useDailyAdhkarProgress'

const VIBRATION_DURATION_MS = 20
const PREVIEW_COUNT = 2

type ReaderProgress = {
  counts: number[]
  targets: number[]
  index: number
  finished: boolean
  markedInWird: boolean
  onCount: () => void
  onRestart: () => void
  error?: string
  loading?: boolean
}

export function AdhkarReader({ category }: { category: AdhkarCategory }) {
  return category.id === DAILY_CATEGORY_ID ? (
    <DailyReader category={category} />
  ) : (
    <FlowReader category={category} />
  )
}

function FlowReader({ category }: { category: AdhkarCategory }) {
  const day = useWirdToday()
  const flow = useAdhkarFlow(category.id, category.items, day)
  const counts = category.items.map((item, index) => {
    if (flow.state.finished || index < flow.state.index) return item.repeat
    return index === flow.state.index ? flow.state.count : 0
  })
  const progress: ReaderProgress = {
    counts,
    targets: category.items.map((item) => item.repeat),
    index: flow.state.index,
    finished: flow.state.finished,
    markedInWird: flow.markedInWird,
    onCount: flow.tap,
    onRestart: flow.restart,
  }
  return <Reader category={category} progress={progress} />
}

function DailyReader({ category }: { category: AdhkarCategory }) {
  const daily = useDailyAdhkarProgress()
  const states = category.items.map((item) => {
    const linked = daily.checklistItems.get(item.id)
    return computeDailyItemState(daily.counts[item.id], linked?.target, linked?.done, item.repeat)
  })
  const first = states.findIndex((item) => !item.done)
  function count() {
    const item = category.items[first]
    if (item) void daily.tap(item, daily.checklistItems.get(item.id))
  }
  function restart() {
    category.items.forEach((item) => daily.reset(item.id))
  }
  const progress: ReaderProgress = {
    counts: states.map((item) => item.count),
    targets: states.map((item) => item.target),
    index: Math.max(first, 0),
    finished: first === -1,
    markedInWird: false,
    onCount: count,
    onRestart: restart,
    loading: daily.isLoading,
    error: Object.values(daily.failedItems).some(Boolean)
      ? ADHKAR_NATIVE_COPY.completionFailed
      : undefined,
  }
  return <Reader category={category} progress={progress} />
}

function Reader({ category, progress }: { category: AdhkarCategory; progress: ReaderProgress }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const index = progress.index
  const item = category.items[index]
  const count = progress.counts[index] ?? 0
  const target = progress.targets[index] ?? item?.repeat ?? 1

  function increment() {
    if (!item || count >= target || progress.loading) return
    progress.onCount()
    if (count + 1 === target) Vibration.vibrate(VIBRATION_DURATION_MS)
  }

  if (progress.loading) {
    return (
      <ScreenContainer testID="adhkar-reader">
        <StateView kind="loading" />
      </ScreenContainer>
    )
  }
  if (progress.finished) {
    return (
      <ScreenContainer testID="adhkar-reader">
        <View className="gap-4">
          <PageHeader backHref="/adhkar" title={category.title} />
          <Text className="font-display text-sheet-title text-ink">{COPY.readerFinishedTitle}</Text>
          <Text className="text-body text-mute">{COPY.readerFinishedBody}</Text>
          {progress.markedInWird && ONCE_DAILY_CATEGORIES.has(category.id) ? (
            <Text className="text-body text-ink">{COPY.markedInWird}</Text>
          ) : null}
          <Button
            label={COPY.readerBack}
            onPress={() => router.replace('/adhkar')}
            variant="solid"
          />
          <Button label={COPY.restart} onPress={progress.onRestart} />
          <Reference
            category={category}
            progress={progress}
            expanded={expanded}
            onToggle={() => setExpanded(!expanded)}
          />
        </View>
      </ScreenContainer>
    )
  }
  if (!item) return null

  return (
    <ScreenContainer testID="adhkar-reader">
      <View className="gap-4">
        <PageHeader backHref="/adhkar" title={category.title} />
        <Text className="text-meta text-mute">
          {toArabicIndic(index + 1)} / {toArabicIndic(category.items.length)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.text}
          accessibilityValue={{ min: 0, max: target, now: count }}
          accessibilityActions={[{ name: 'increment' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') increment()
          }}
          onPress={increment}
          className="gap-4 rounded-card border border-line bg-surface p-6"
        >
          <Text className="font-text text-daily-line text-start text-ink">{item.text}</Text>
          <ProgressBar done={count} total={target} />
          <Text className="text-body text-accent">{COPY.readerCount(count, target)}</Text>
        </Pressable>
        <Text className="text-meta text-mute">{COPY.readerTapHint}</Text>
        {progress.error ? (
          <Text accessibilityRole="alert" className="text-meta text-gold-ink">
            {progress.error}
          </Text>
        ) : null}
        <View className="gap-2">
          <Text className="font-sans-bold text-body text-ink">{COPY.readerNext}</Text>
          {category.items.slice(index + 1, index + 1 + PREVIEW_COUNT).map((next, offset) => (
            <View key={next.id} className="flex-row gap-2">
              <Text numberOfLines={1} className="flex-1 text-meta text-mute">
                {next.text}
              </Text>
              <Text className="text-meta text-gold-ink">
                ×{toArabicIndic(progress.targets[index + offset + 1])}
              </Text>
            </View>
          ))}
        </View>
        <Reference
          category={category}
          progress={progress}
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
      </View>
    </ScreenContainer>
  )
}

function Reference({
  category,
  progress,
  expanded,
  onToggle,
}: {
  category: AdhkarCategory
  progress: ReaderProgress
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Accordion
      title={`${COPY.allSectionAdhkar} (${toArabicIndic(category.items.length)})`}
      expanded={expanded}
      onToggle={onToggle}
    >
      {category.items.map((entry, entryIndex) => (
        <View key={entry.id} testID={`adhkar-reader-item-${entry.id}`} className="gap-2 py-3">
          <Text className="font-text text-meta text-start text-ink">{entry.text}</Text>
          <Text className="text-meta text-accent">
            {progress.counts[entryIndex] >= progress.targets[entryIndex]
              ? COPY.done
              : entryIndex === progress.index
                ? COPY.readerCount(progress.counts[entryIndex], progress.targets[entryIndex])
                : `×${toArabicIndic(progress.targets[entryIndex])}`}
          </Text>
          {entry.virtue ? <Text className="text-meta text-mute">{entry.virtue}</Text> : null}
        </View>
      ))}
    </Accordion>
  )
}
