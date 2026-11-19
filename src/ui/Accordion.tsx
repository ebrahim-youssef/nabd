import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { Text } from '../shell/Text'

export function Accordion({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  testID,
}: {
  title: string
  subtitle?: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  testID?: string
}) {
  const theme = useThemeColors()
  const Icon = expanded ? ChevronUp : ChevronDown
  return (
    <View className="overflow-hidden rounded-card border border-line bg-surface" testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="min-h-[54px] flex-row items-center gap-3 px-3.5 py-2"
        onPress={onToggle}
      >
        <View className="flex-1">
          <Text className="font-sans-medium text-row-label text-ink">{title}</Text>
          {subtitle ? <Text className="font-sans text-meta text-mute">{subtitle}</Text> : null}
        </View>
        <Icon accessible={false} color={theme.mute} size={ICON_SIZE} />
      </Pressable>
      {expanded ? <View className="border-t border-line px-3.5">{children}</View> : null}
    </View>
  )
}
