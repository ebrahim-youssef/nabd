import { SETTINGS_COPY } from './copy'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { useLocationCapability } from '../device/useLocationCapability'
import { deviceCopy } from '../device/copy'
import { Text } from '../shell/Text'

export function LocationSection() {
  const { status, isRefreshing, refresh, runAction } = useLocationCapability()

  return (
    <View className="gap-3" testID="settings-location">
      <Text className="font-display text-label text-start text-muted-foreground">
        {SETTINGS_COPY.location.title}
      </Text>
      <View className="gap-3 rounded-card border border-border bg-surface p-4 shadow-card-sm">
        <View className="flex-row items-center gap-2">
          <Text className="text-body text-start text-foreground">
            {SETTINGS_COPY.location.heading}
          </Text>
          {isRefreshing ? (
            <ActivityIndicator size="small" testID="settings-location-refreshing" />
          ) : null}
        </View>
        <Text
          className="text-small text-start text-muted-foreground"
          testID="settings-location-message"
        >
          {status.message}
        </Text>
        {status.action || status.state === 'ready' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRefreshing }}
            className={`rounded-button border border-primary bg-primary/10 px-4 py-3 ${isRefreshing ? 'opacity-50' : ''}`}
            disabled={isRefreshing}
            onPress={() =>
              status.action ? void runAction(status.action.type) : void refresh({ force: true })
            }
            testID={status.action ? 'settings-location-action' : 'settings-location-refresh'}
          >
            <Text className="text-body text-center font-body-medium text-primary">
              {status.action?.label ?? deviceCopy.actions.refreshLocation}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
