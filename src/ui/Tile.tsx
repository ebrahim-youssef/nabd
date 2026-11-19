import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'

type TileProps = {
  title: string
  sub: string
  count?: string | number
  quiet?: boolean
  onPress: () => void
}

export function Tile({ title, sub, count, quiet = false, onPress }: TileProps) {
  const isQuiet = quiet || count === 0 || count === '0' || count === '٠'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${count != null && !isQuiet ? `، ${count}` : ''}`}
      className={`min-h-[68px] flex-1 flex-row items-center justify-between rounded-tile border px-3.5 py-2.5 ${
        isQuiet ? 'border-dashed border-line bg-transparent' : 'border-line bg-surface shadow-card'
      }`}
      onPress={onPress}
    >
      <View className="flex-1">
        <Text className="font-sans-bold text-row-label text-ink">{title}</Text>
        <Text className="font-sans text-caption text-mute">{sub}</Text>
      </View>
      {count != null && !isQuiet ? (
        <Text className="font-display text-tile-count text-gold-ink">{count}</Text>
      ) : null}
    </Pressable>
  )
}
