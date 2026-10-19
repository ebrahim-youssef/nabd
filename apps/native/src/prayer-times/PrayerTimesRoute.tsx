import { CALCULATION_METHODS, SETTINGS_COPY, shellCopy } from '@nabd/shared'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { formatPrayerTime } from './formatPrayerTime'
import { useTodayPrayerTimes } from './useTodayPrayerTimes'

type PrayerTimesRouteProps = {
  now?: () => number
  today?: () => Date
}

export function PrayerTimesRoute({ now = Date.now, today }: PrayerTimesRouteProps = {}) {
  const {
    changeMethod,
    isRefreshing,
    methodId,
    points,
    prayerStatus,
    runAction,
    status: locationStatus,
    times,
    timeline,
  } = useTodayPrayerTimes({ now, today })
  const showLocationMessage = locationStatus.state !== 'ready'

  return (
    <ScreenContainer testID="prayer-times-screen">
      <View className="gap-6">
        <PageHeader backHref="/" title={shellCopy.nav.prayerTimes} />
        <View className="gap-3" testID="prayer-methods">
          <Text className="font-display text-label text-start text-muted-foreground">
            {SETTINGS_COPY.prayerMethod.title}
          </Text>
          <View className="gap-2">
            {CALCULATION_METHODS.map((method) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: method.id === methodId }}
                className={`rounded-card border px-4 py-3 ${method.id === methodId ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
                key={method.id}
                onPress={() => void changeMethod(method.id)}
                testID={`prayer-method-${method.id}`}
              >
                <Text
                  className={
                    method.id === methodId
                      ? 'text-body text-on-primary'
                      : 'text-body text-foreground'
                  }
                >
                  {method.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View
          className="gap-3 rounded-card border border-border bg-surface p-4 shadow-card-sm"
          testID="prayer-times-location-card"
        >
          <View className="flex-row items-center gap-2">
            {isRefreshing ? (
              <ActivityIndicator size="small" testID="prayer-times-location-refreshing" />
            ) : null}
          </View>
          {showLocationMessage ? (
            <Text
              className="text-small text-start text-muted-foreground"
              testID="prayer-times-location-message"
            >
              {locationStatus.message}
            </Text>
          ) : null}
          {locationStatus.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isRefreshing }}
              className={`rounded-button border border-primary bg-primary/10 px-4 py-3 ${isRefreshing ? 'opacity-50' : ''}`}
              disabled={isRefreshing}
              onPress={() => void runAction()}
              testID="prayer-times-location-action"
            >
              <Text className="text-body text-center font-body-medium text-primary">
                {locationStatus.action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {times ? (
          <View className="gap-3" testID="prayer-times-table">
            <Text className="text-body text-start text-primary" testID="prayer-status">
              {prayerStatus ?? ''}
            </Text>
            <View className="gap-2">
              {points.map((point) => (
                <View
                  accessibilityState={{ selected: timeline?.point.id === point.id }}
                  className={`flex-row items-center justify-between rounded-card border px-4 py-3 ${timeline?.point.id === point.id ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
                  key={point.id}
                  testID={`prayer-row-${point.id}`}
                >
                  <Text className="text-body text-start text-foreground">{point.label}</Text>
                  <Text className="text-body text-start text-primary">
                    {formatPrayerTime(point.at)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  )
}
