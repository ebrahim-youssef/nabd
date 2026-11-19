import { ActivityIndicator, Pressable, View } from 'react-native'

import { useLocationCapability } from '../device/useLocationCapability'
import { Text } from '../shell/Text'
import { ListRow } from '../ui/ListRow'
import { SETTINGS_COPY, SETTINGS_LAYOUT_COPY } from './copy'

export function LocationSection() {
  const { status, isRefreshing, refresh, runAction } = useLocationCapability()
  const action = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isRefreshing }}
      disabled={isRefreshing}
      onPress={() =>
        status.action ? void runAction(status.action.type) : void refresh({ force: true })
      }
    >
      {isRefreshing ? (
        <ActivityIndicator size="small" />
      ) : (
        <Text className="font-sans-bold text-caption text-accent">
          {status.action?.label ?? SETTINGS_LAYOUT_COPY.locationRefresh}
        </Text>
      )}
    </Pressable>
  )
  return (
    <View testID="settings-location">
      <ListRow
        label={SETTINGS_COPY.location.title}
        description={SETTINGS_LAYOUT_COPY.locationDescription}
        accessory={action}
      />
      {status.state !== 'ready' ? (
        <Text className="px-3.5 pb-2 font-sans text-meta text-mute">{status.message}</Text>
      ) : null}
    </View>
  )
}
