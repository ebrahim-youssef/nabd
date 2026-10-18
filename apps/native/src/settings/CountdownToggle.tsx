import { useEffect, useState } from 'react'
import { AppState, Switch, View } from 'react-native'

import {
  getCountdownNotificationStatus,
  type CountdownNotificationResult,
} from '../device/countdownNotification'
import { requestPrayerReschedule } from '../device/prayerAlarms'
import type { NotificationPermission } from '../device/types'
import { Text } from '../shell/Text'
import { NATIVE_SETTINGS_COPY } from './constants'
import { useCountdownPreference } from './useCountdownPreference'

type CountdownToggleProps = {
  notificationPermission: NotificationPermission
  notificationsEnabled: boolean
}

export function CountdownToggle({
  notificationPermission,
  notificationsEnabled,
}: CountdownToggleProps) {
  const { enabled, setEnabled } = useCountdownPreference()
  const [status, setStatus] = useState<CountdownNotificationResult | null>(null)
  const disabled = notificationPermission !== 'granted' || !notificationsEnabled

  useEffect(() => {
    const readStatus = () => setStatus(getCountdownNotificationStatus())
    readStatus()
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') readStatus()
    })

    return () => subscription.remove()
  }, [])

  async function handleValueChange(value: boolean): Promise<void> {
    await setEnabled(value)
    requestPrayerReschedule()
  }

  return (
    <View
      className={`flex-row items-start justify-between gap-3 rounded-card border p-4 ${enabled ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
      testID="notification-countdown-row"
    >
      <View className="flex-1 gap-1">
        <Text className="text-body text-start text-foreground">
          {NATIVE_SETTINGS_COPY.notifications.countdownTitle}
        </Text>
        <Text className="text-small text-start text-muted-foreground">
          {NATIVE_SETTINGS_COPY.notifications.countdownBody}
        </Text>
        {enabled && status === 'channel-blocked' ? (
          <Text className="text-small text-start text-muted-foreground">
            {NATIVE_SETTINGS_COPY.notifications.countdownBlocked}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={NATIVE_SETTINGS_COPY.notifications.countdownTitle}
        accessibilityRole="switch"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onValueChange={(value) => void handleValueChange(value)}
        testID="notification-countdown"
        value={enabled}
      />
    </View>
  )
}
