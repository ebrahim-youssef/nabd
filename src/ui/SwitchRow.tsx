import { Pressable, Switch, View } from 'react-native'

import { useThemeColors } from '../../theme/tokens'
import { Text } from '../shell/Text'

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  disabledReason,
}: {
  label: string
  description?: string
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  disabledReason?: string
}) {
  const theme = useThemeColors()
  const detail = disabled && disabledReason ? disabledReason : description
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      className={`min-h-[54px] flex-row items-center gap-3 px-3.5 py-2 ${disabled ? 'opacity-[0.45]' : ''}`}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
    >
      <View className="flex-1">
        <Text className="font-sans-medium text-row-label text-ink">{label}</Text>
        {detail ? <Text className="font-sans text-meta text-mute">{detail}</Text> : null}
      </View>
      <Switch
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onValueChange={() => undefined}
        pointerEvents="none"
        trackColor={{ false: theme.track, true: theme.accent }}
        thumbColor={theme.surface}
        value={value}
      />
    </Pressable>
  )
}
