import { summarizeChecklist, toArabicIndic, WIRD_COPY } from '@nabd/shared'
import { Circle, Svg } from 'react-native-svg'
import { Text, View } from 'react-native'
import { useMemo } from 'react'

import { useWirdDay } from './WirdDayProvider'

type NativeTheme = {
  colors: {
    gold: string
    'on-primary': string
    'ring-track': string
  }
}

const NATIVE_THEME = require('../../generated/nativewind-theme.cjs') as NativeTheme
const RING_RADIUS = 42
const RING_STROKE = 8
const RING_CENTER = RING_RADIUS + RING_STROKE / 2
const RING_SIZE = RING_CENTER * 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const RING_ROTATION = -90
const COUNT_SEPARATOR = '/'
const SUMMARY_TEST_ID = 'today-summary'
const SUMMARY_RING_TEST_ID = 'summary-ring'
const SUMMARY_DONE_TEST_ID = 'summary-done'
const SUMMARY_TOTAL_TEST_ID = 'summary-total'
const SUMMARY_REMAINING_TEST_ID = 'summary-remaining'
const SUMMARY_VOLUNTARY_TEST_ID = 'summary-voluntary'

export function TodaySummary() {
  const { areas, isLoading } = useWirdDay()
  const summary = useMemo(() => summarizeChecklist(areas), [areas])

  if (isLoading) return <View className="h-28 w-full rounded-card bg-surface-2" />

  const { total, done, remaining, voluntary } = summary
  if (total === 0 && voluntary.total === 0) return null

  const fraction = total > 0 ? done / total : 0
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction)
  return (
    <View
      accessibilityLabel={WIRD_COPY.summaryAria(toArabicIndic(done), toArabicIndic(total))}
      className="flex-row items-center gap-5 rounded-card bg-primary p-5"
      testID={SUMMARY_TEST_ID}
    >
      <View className="relative shrink-0" style={{ height: RING_SIZE, width: RING_SIZE }}>
        <Svg
          accessible
          accessibilityLabel={WIRD_COPY.summaryAria(toArabicIndic(done), toArabicIndic(total))}
          height={RING_SIZE}
          testID={SUMMARY_RING_TEST_ID}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          width={RING_SIZE}
        >
          <Circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            fill="none"
            r={RING_RADIUS}
            stroke={NATIVE_THEME.colors['ring-track']}
            strokeWidth={RING_STROKE}
          />
          <Circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            fill="none"
            r={RING_RADIUS}
            stroke={NATIVE_THEME.colors.gold}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth={RING_STROKE}
            transform={`rotate(${RING_ROTATION} ${RING_CENTER} ${RING_CENTER})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-title text-on-primary">
            <Text testID={SUMMARY_DONE_TEST_ID}>{toArabicIndic(done)}</Text>
            {COUNT_SEPARATOR}
            <Text testID={SUMMARY_TOTAL_TEST_ID}>{toArabicIndic(total)}</Text>
          </Text>
        </View>
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-title font-medium text-on-primary">{WIRD_COPY.todayTitle}</Text>
        <Text className="text-small text-on-primary">
          {WIRD_COPY.remainingPrefix}{' '}
          <Text testID={SUMMARY_REMAINING_TEST_ID}>{toArabicIndic(remaining)}</Text>{' '}
          {WIRD_COPY.remainingSuffix}
        </Text>
        {voluntary.total > 0 && (
          <Text className="text-small text-gold" testID={SUMMARY_VOLUNTARY_TEST_ID}>
            {WIRD_COPY.voluntary}: {toArabicIndic(voluntary.done)}/{toArabicIndic(voluntary.total)}
          </Text>
        )}
      </View>
    </View>
  )
}
