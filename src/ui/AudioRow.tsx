import { Play, Square } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { Text } from '../shell/Text'
import { uiCopy } from './copy'

export function AudioRow({
  label,
  description,
  playing,
  onToggle,
}: {
  label: string
  description: string
  playing: boolean
  onToggle: () => void
}) {
  const theme = useThemeColors()
  const Icon = playing ? Square : Play
  const action = playing ? uiCopy.stop : uiCopy.play
  return (
    <View className="min-h-[58px] flex-row items-center gap-3">
      <View className="flex-1">
        <Text className="font-sans-medium text-row-label text-ink">{label}</Text>
        <Text className="font-sans text-meta text-mute">{description}</Text>
      </View>
      <Pressable
        accessibilityLabel={`${action}، ${label}`}
        accessibilityRole="button"
        className={`size-[34px] items-center justify-center rounded-pill ${playing ? 'bg-accent' : 'border border-line bg-now'}`}
        onPress={onToggle}
      >
        <Icon
          accessible={false}
          color={playing ? theme['on-accent'] : theme['gold-ink']}
          size={ICON_SIZE}
        />
      </Pressable>
    </View>
  )
}
