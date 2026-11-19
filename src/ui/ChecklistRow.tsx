import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'
import { StarCheckbox } from './StarCheckbox'

type ChecklistRowProps = {
  label: string
  sub?: string
  optional?: boolean
  done: boolean
  onToggle: () => void
  testID?: string
  first?: boolean
}

export function ChecklistRow({
  label,
  sub,
  optional = false,
  done,
  onToggle,
  testID,
  first = false,
}: ChecklistRowProps) {
  const stateLabel = `${label}${optional ? '، تطوّع' : ''}، ${done ? 'تم' : 'لم يُسجَّل'}`
  return (
    <Pressable
      accessibilityLabel={stateLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      className={`min-h-[46px] flex-row items-center gap-3 ${first ? 'border-t-0' : 'border-t border-line'}`}
      onPress={onToggle}
      testID={testID}
    >
      <View className="flex-1 flex-row items-center">
        <View className="flex-1">
          <Text className={`font-sans-medium text-row-label ${done ? 'text-mute' : 'text-ink'}`}>
            {label}
          </Text>
          {sub ? <Text className="font-sans text-caption text-mute">{sub}</Text> : null}
        </View>
        {optional ? (
          <Text className="ms-1 rounded-pill border border-gold-ink px-2 text-chip font-sans-medium text-gold-ink">
            تطوّع
          </Text>
        ) : null}
      </View>
      <StarCheckbox
        accessible={false}
        checked={done}
        interactive={false}
        label={label}
        onChange={() => onToggle()}
      />
    </Pressable>
  )
}
