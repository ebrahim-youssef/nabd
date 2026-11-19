import { Pressable } from 'react-native'

import { Text } from '../shell/Text'

type ButtonProps = {
  label: string
  onPress: () => void
  variant?: 'outline' | 'solid'
}

export function Button({ label, onPress, variant = 'outline' }: ButtonProps) {
  const isSolid = variant === 'solid'
  return (
    <Pressable
      accessibilityRole="button"
      className={`w-full items-center rounded-button border px-4.5 py-2.5 ${
        isSolid ? 'border-accent bg-accent' : 'border-gold bg-transparent'
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-sans-bold text-button ${isSolid ? 'text-on-accent' : 'text-gold-ink'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
