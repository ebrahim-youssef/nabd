import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'

export function StatTile({
  label,
  value,
  caption,
  onPress,
  valueDirection,
}: {
  label: string
  value: string | number
  caption?: string
  onPress?: () => void
  valueDirection?: 'ltr' | 'rtl'
}) {
  const content = (
    <View className="min-h-[92px] flex-1 justify-between rounded-tile border border-line bg-surface p-3.5">
      <Text className="font-sans text-caption text-mute">{label}</Text>
      <Text
        className="font-display text-[26px] text-ink"
        style={valueDirection ? { direction: valueDirection } : undefined}
      >
        {value}
      </Text>
      {caption ? <Text className="font-sans text-meta text-mute">{caption}</Text> : null}
    </View>
  )
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  )
}
