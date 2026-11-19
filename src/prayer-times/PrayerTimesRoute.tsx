import { useState } from 'react'
import { AlertCircle, Globe, MapPin } from 'lucide-react-native'
import { Pressable, View } from 'react-native'
import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { SectionHeader } from '../ui/SectionHeader'
import { StateView } from '../ui/StateView'
import { StatusCard } from '../ui/StatusCard'
import { COPY } from './copy'
import { formatPrayerTime } from './formatPrayerTime'
import { CALCULATION_METHODS, formatDuration } from './logic'
import { MethodSheet } from './MethodSheet'
import { useTodayPrayerTimes } from './useTodayPrayerTimes'

export function PrayerTimesRoute({
  now = Date.now,
  today,
}: { now?: () => number; today?: () => Date } = {}) {
  const {
    changeMethod,
    currentPoint,
    date,
    instant,
    isRefreshing,
    methodId,
    nextPrayer,
    points,
    prayerStatus,
    refresh,
    runAction,
    status,
    times,
  } = useTodayPrayerTimes({ now, today })
  const [sheetVisible, setSheetVisible] = useState(false)
  const method = CALCULATION_METHODS.find((entry) => entry.id === methodId)
  const isEmpty = !times && status.state === 'permission-required'
  const action =
    status.action && !isRefreshing
      ? { label: status.action.label, onPress: () => void runAction() }
      : undefined
  const dateLabel = new Intl.DateTimeFormat('ar-EG-u-ca-islamic-umalqura', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  const refreshAccessory = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isRefreshing }}
      className={isRefreshing ? 'opacity-[0.45]' : ''}
      disabled={isRefreshing}
      onPress={() => void refresh({ force: true })}
      testID="prayer-times-location-action"
    >
      <Text className="font-sans-bold text-caption text-accent">{COPY.refreshLocation}</Text>
    </Pressable>
  )
  const nowChip = (
    <Text className="rounded-pill bg-track px-2 font-sans-bold text-chip text-accent">
      {COPY.now}
    </Text>
  )

  return (
    <ScreenContainer testID="prayer-times-screen">
      <View className="gap-6">
        <PageHeader backHref="/more" title={COPY.pageTitle} />
        {isEmpty ? (
          <StateView
            kind="empty"
            icon={MapPin}
            title={COPY.enableLocation}
            body={COPY.locationPrivacy}
            action={action}
          />
        ) : null}
        {status.state !== 'ready' && !isEmpty ? (
          <View testID="prayer-times-location-card">
            <StatusCard
              tone={status.state === 'offline-cache' ? 'info' : 'warn'}
              icon={AlertCircle}
              message={status.message}
              action={action}
            />
          </View>
        ) : null}
        {times ? (
          <View className="gap-6" testID="prayer-times-table">
            <View className="gap-2 rounded-hero bg-hero p-5">
              <Text className="font-sans text-meta text-hero-mute">{dateLabel}</Text>
              {nextPrayer ? (
                <Text className="font-display text-prayer-name text-hero-ink">
                  {nextPrayer.label}
                </Text>
              ) : null}
              {nextPrayer ? (
                <Text className="font-sans-medium text-countdown text-gold">
                  {formatDuration(nextPrayer.at - instant)}
                </Text>
              ) : null}
              {currentPoint ? (
                <Text className="font-sans text-meta text-hero-mute">
                  {COPY.elapsed(currentPoint.label, formatDuration(instant - currentPoint.at))}
                </Text>
              ) : null}
              {prayerStatus ? (
                <Text className="font-sans text-meta text-hero-mute" testID="prayer-status">
                  {prayerStatus}
                </Text>
              ) : null}
            </View>
            <ListGroup>
              {points.map((point) => (
                <ListRow
                  key={point.id}
                  label={point.label}
                  value={formatPrayerTime(point.at)}
                  current={currentPoint?.id === point.id}
                  accessory={currentPoint?.id === point.id ? nowChip : undefined}
                  testID={`prayer-row-${point.id}`}
                />
              ))}
            </ListGroup>
            <View className="gap-2">
              <SectionHeader title={COPY.calculation} />
              <ListGroup>
                <ListRow
                  label={COPY.methodTitle}
                  value={method?.label}
                  icon={Globe}
                  onPress={() => setSheetVisible(true)}
                  testID="prayer-methods"
                />
                {status.state === 'ready' ? (
                  <ListRow
                    label={COPY.location}
                    description={COPY.locationReady}
                    icon={MapPin}
                    accessory={refreshAccessory}
                  />
                ) : null}
              </ListGroup>
            </View>
            {status.state === 'ready' ? (
              <Text className="font-sans text-meta text-mute">{COPY.ready}</Text>
            ) : null}
          </View>
        ) : null}
        <MethodSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          methodId={methodId}
          onSelect={(id) => void changeMethod(id)}
        />
      </View>
    </ScreenContainer>
  )
}
