import type { LucideIcon } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { Text } from '../shell/Text'

export function StatusCard({
  tone,
  icon: Icon,
  message,
  detail,
  action,
}: {
  tone: 'info' | 'warn' | 'ok'
  icon: LucideIcon
  message: string
  detail?: string
  action?: { label: string; onPress: () => void; primary?: boolean }
}) {
  const theme = useThemeColors()
  const isWarn = tone === 'warn'
  return (
    <View
      accessibilityLiveRegion="polite"
      className={`flex-row items-start gap-3 rounded-tile border p-3.5 ${isWarn ? 'border-gold bg-now' : 'border-line bg-now'}`}
    >
      <View className="size-9 items-center justify-center rounded-[12px] border border-line bg-surface">
        <Icon
          accessible={false}
          color={tone === 'ok' ? theme.accent : theme['gold-ink']}
          size={ICON_SIZE}
        />
      </View>
      <View className="flex-1">
        <Text className="font-sans-medium text-row-label text-ink">{message}</Text>
        {detail ? <Text className="mt-0.5 font-sans text-meta text-mute">{detail}</Text> : null}
        {action ? (
          <Pressable
            accessibilityRole="button"
            className={`mt-2 self-start rounded-control border px-3 py-1.5 ${action.primary ? 'border-accent bg-accent' : 'border-gold bg-transparent'}`}
            onPress={action.onPress}
          >
            <Text
              className={`font-sans-bold text-caption ${action.primary ? 'text-on-accent' : 'text-gold-ink'}`}
            >
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
