import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'

export function OptionCard({
  title,
  description,
  selected,
  onPress,
  badge,
  disabled = false,
}: {
  title: string
  description?: string
  selected: boolean
  onPress: () => void
  badge?: string
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      className={`min-h-[64px] flex-row items-center gap-3 rounded-tile border-2 px-3.5 py-3 ${
        selected ? 'border-accent bg-now' : 'border-line bg-surface'
      } ${disabled ? 'opacity-[0.45]' : ''}`}
      disabled={disabled}
      onPress={onPress}
    >
      <View
        className={`size-5 items-center justify-center rounded-pill border ${
          selected ? 'border-accent' : 'border-line'
        }`}
      >
        {selected ? <View className="size-2.5 rounded-pill bg-accent" /> : null}
      </View>
      <View className="flex-1">
        <Text className="font-sans-medium text-row-label text-ink">{title}</Text>
        {description ? <Text className="font-sans text-meta text-mute">{description}</Text> : null}
      </View>
      {badge ? <Text className="font-sans-bold text-chip text-gold-ink">{badge}</Text> : null}
    </Pressable>
  )
}
