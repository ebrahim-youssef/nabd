import { Switch, View } from 'react-native'

import type { NotificationPermission } from '../device/types'
import { Text } from '../shell/Text'
import { NATIVE_SETTINGS_COPY } from './constants'
import { useCountdownPreference } from './useCountdownPreference'

type CountdownToggleProps = {
  notificationPermission: NotificationPermission
}

export function CountdownToggle({ notificationPermission }: CountdownToggleProps) {
  const { enabled, setEnabled } = useCountdownPreference()
  const disabled = notificationPermission !== 'granted'

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
      </View>
      <Switch
        accessibilityLabel={NATIVE_SETTINGS_COPY.notifications.countdownTitle}
        accessibilityRole="switch"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onValueChange={(value) => void setEnabled(value)}
        testID="notification-countdown"
        value={enabled}
      />
    </View>
  )
}
