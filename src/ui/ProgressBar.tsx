import { View } from 'react-native'

import { toArabicIndic } from '../lib/format'
import { Text } from '../shell/Text'

type ProgressBarProps = { done: number; total: number; meta?: string | null }

export function ProgressBar({ done, total, meta }: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  const label = meta ?? `${toArabicIndic(done)} من ${toArabicIndic(total)} مطلوبة`
  return (
    <View>
      <View
        accessibilityLabel={label}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: done }}
        className="h-1.5 overflow-hidden rounded-pill bg-track"
      >
        <View className="h-full rounded-pill bg-progress" style={{ width: `${percent}%` }} />
      </View>
      <View className="mt-1.5 flex-row justify-between">
        {meta !== null ? <Text className="font-sans text-meta text-mute">{label}</Text> : <View />}
        <Text className="font-sans text-meta text-mute" style={{ direction: 'ltr' }}>
          {toArabicIndic(percent)}٪
        </Text>
      </View>
    </View>
  )
}
