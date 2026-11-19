import { Pressable, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

import { nextDay } from '../lib/day'
import type { DayId } from '../wird/types'
import { Text } from '../shell/Text'
import { ProgressBar } from './ProgressBar'
import { daySpan, TODAY_COPY } from '../today/copy'
import { useThemeColors } from '../../theme/tokens'

type DayHeaderProps = {
  day: DayId
  progress: { done: number; required: number }
  onPrev: () => void
  onNext?: () => void
  onPickDate?: () => void
}

const DAY_BUTTON_SIZE = 36
const DAY_BUTTON_ICON_SIZE = 18
const DAY_BUTTON_HIT_SLOP = 6
const MONTH_INDEX_OFFSET = 1
const DATE_LABEL_NOON_HOUR = 12

type DayHeaderIcons = {
  ChevronLeft: LucideIcon
  ChevronRight: LucideIcon
}

export function DayHeader({ day, progress, onPrev, onNext, onPickDate }: DayHeaderProps) {
  const theme = useThemeColors()
  const date = dateForDay(day)
  const nextDate = dateForDay(nextDay(day))
  const dateLabel = new Intl.DateTimeFormat('ar-EG-u-ca-islamic-umalqura', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  const weekday = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date)
  const nextWeekday = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(nextDate)

  return (
    <View className="gap-2 px-6 pb-2 pt-8">
      <View className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-display text-screen-title text-ink">
          {TODAY_COPY.title}
        </Text>
        <View className="flex-row items-center gap-2">
          <StepButton
            accessibilityLabel={TODAY_COPY.previousDay}
            onPress={onPrev}
            direction="previous"
            color={theme.ink}
          />
          {onNext ? (
            <StepButton
              accessibilityLabel={TODAY_COPY.nextDay}
              onPress={onNext}
              direction="next"
              color={theme.ink}
            />
          ) : null}
        </View>
      </View>
      {onPickDate ? (
        <Pressable accessibilityRole="button" accessibilityLabel={dateLabel} onPress={onPickDate}>
          <Text className="font-sans-medium text-body text-ink">{dateLabel}</Text>
        </Pressable>
      ) : (
        <Text className="font-sans-medium text-body text-ink">{dateLabel}</Text>
      )}
      <Text className="font-sans text-meta text-mute">{daySpan(weekday, nextWeekday)}</Text>
      <ProgressBar done={progress.done} total={progress.required} />
    </View>
  )
}

function StepButton({
  accessibilityLabel,
  onPress,
  direction,
  color,
}: {
  accessibilityLabel: string
  onPress: () => void
  direction: 'previous' | 'next'
  color: string
}) {
  const { ChevronLeft, ChevronRight } = require('lucide-react-native') as DayHeaderIcons
  const Icon = direction === 'previous' ? ChevronRight : ChevronLeft
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={DAY_BUTTON_HIT_SLOP}
      onPress={onPress}
      className="items-center justify-center rounded-control border border-line bg-surface"
      style={{ width: DAY_BUTTON_SIZE, height: DAY_BUTTON_SIZE }}
    >
      <Icon color={color} size={DAY_BUTTON_ICON_SIZE} />
    </Pressable>
  )
}

function dateForDay(day: DayId): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  return new Date(year, month - MONTH_INDEX_OFFSET, dayOfMonth, DATE_LABEL_NOON_HOUR)
}
