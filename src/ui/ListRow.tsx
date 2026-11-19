import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react-native'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { Text } from '../shell/Text'

export type ListRowProps = {
  label: string
  description?: string
  value?: string
  icon?: LucideIcon
  onPress?: () => void
  disabled?: boolean
  accessory?: ReactNode
  current?: boolean
  testID?: string
}

export function ListRow({
  label,
  description,
  value,
  icon: Icon,
  onPress,
  disabled = false,
  accessory,
  current = false,
  testID,
}: ListRowProps) {
  const theme = useThemeColors()
  const content = (
    <View
      className={`min-h-[54px] flex-row items-center gap-3 px-3.5 py-2 ${current ? 'bg-now' : 'bg-transparent'}`}
    >
      {Icon ? (
        <View className="size-[34px] items-center justify-center rounded-control border border-line bg-now">
          <Icon accessible={false} color={theme['gold-ink']} size={ICON_SIZE} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text className="font-sans-medium text-row-label text-ink">{label}</Text>
        {description ? <Text className="font-sans text-meta text-mute">{description}</Text> : null}
      </View>
      {value ? <Text className="font-sans text-meta text-mute">{value}</Text> : null}
      {accessory ??
        (onPress ? <ChevronLeft accessible={false} color={theme.mute} size={ICON_SIZE} /> : null)}
    </View>
  )

  if (!onPress) {
    return (
      <View
        accessibilityState={disabled ? { disabled: true } : undefined}
        className={disabled ? 'opacity-[0.45]' : ''}
        testID={testID}
      >
        {content}
      </View>
    )
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={disabled ? { disabled: true } : undefined}
      className={disabled ? 'opacity-[0.45]' : ''}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      {content}
    </Pressable>
  )
}
