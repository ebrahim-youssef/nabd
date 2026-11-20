import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'

export type SegmentOption<T extends string> = { value: T; label: string }

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  accessibilityLabel: string
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} className="flex-row rounded-[12px] bg-track p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className={`min-h-10 flex-1 items-center justify-center rounded-control px-2 ${selected ? 'bg-surface' : ''}`}
            key={option.value}
            onPress={() => onChange(option.value)}
          >
            <Text
              className={`text-row-label ${selected ? 'font-sans-bold text-ink' : 'font-sans text-mute'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
