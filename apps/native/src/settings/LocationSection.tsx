import { SETTINGS_COPY } from './copy'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { useLocationCapability } from '../device/useLocationCapability'
import { Text } from '../shell/Text'

export function LocationSection() {
  const { status, isRefreshing, runAction } = useLocationCapability()

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
        {status.action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRefreshing }}
            className={`rounded-button border border-primary bg-primary/10 px-4 py-3 ${isRefreshing ? 'opacity-50' : ''}`}
            disabled={isRefreshing}
            onPress={() => void runAction(status.action?.type)}
            testID="settings-location-action"
          >
            <Text className="text-body text-center font-body-medium text-primary">
              {status.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
