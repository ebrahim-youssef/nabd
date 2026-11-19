import { SETTINGS_COPY } from './copy'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { useLocationCapability } from '../device/useLocationCapability'
import { deviceCopy } from '../device/copy'
import { Text } from '../shell/Text'

export function LocationSection() {
  const { status, isRefreshing, refresh, runAction } = useLocationCapability()

  return (
    <View className="gap-3" testID="settings-location">
      <Text className="font-sans-bold text-chip text-start text-ink">
        {SETTINGS_COPY.location.title}
      </Text>
      <View className="gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <View className="flex-row items-center gap-2">
          <Text className="text-body text-start text-ink">{SETTINGS_COPY.location.heading}</Text>
          {isRefreshing ? (
            <ActivityIndicator size="small" testID="settings-location-refreshing" />
          ) : null}
        </View>
        <Text className="text-meta text-start text-ink" testID="settings-location-message">
          {status.message}
        </Text>
        {status.action || status.state === 'ready' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRefreshing }}
            className={`rounded-button border border-accent bg-accent/10 px-4 py-3 ${isRefreshing ? 'opacity-50' : ''}`}
            disabled={isRefreshing}
            onPress={() =>
              status.action ? void runAction(status.action.type) : void refresh({ force: true })
            }
            testID={status.action ? 'settings-location-action' : 'settings-location-refresh'}
          >
            <Text className="text-body text-center font-sans-medium text-accent">
              {status.action?.label ?? deviceCopy.actions.refreshLocation}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
