import type { LucideIcon } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { shellCopy } from '../shell/copy'
import { Text } from '../shell/Text'

export function StateView({
  kind,
  icon: Icon,
  title,
  body,
  action,
}: {
  kind: 'empty' | 'error' | 'loading'
  icon?: LucideIcon
  title?: string
  body?: string
  action?: { label: string; onPress: () => void }
}) {
  const theme = useThemeColors()
  if (kind === 'loading') {
    return (
      <View
        accessible
        accessibilityLabel={shellCopy.loading}
        accessibilityRole="progressbar"
        className="gap-3 rounded-card border border-line bg-surface p-4"
      >
        <View className="h-4 w-2/3 rounded-pill bg-track" />
        <View className="h-3 w-full rounded-pill bg-track" />
        <View className="h-3 w-4/5 rounded-pill bg-track" />
      </View>
    )
  }
  return (
    <View className="items-center gap-2 rounded-card border border-line bg-surface px-5 py-6">
      {Icon ? <Icon accessible={false} color={theme.mute} size={ICON_SIZE} /> : null}
      {title ? (
        <Text className="text-center font-display text-card-title text-ink">{title}</Text>
      ) : null}
      {body ? <Text className="text-center font-sans text-body text-mute">{body}</Text> : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          className="mt-1 rounded-button border border-gold px-4 py-2"
          onPress={action.onPress}
        >
          <Text className="font-sans-bold text-button text-gold-ink">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
