import { Pressable } from 'react-native'

import { Text } from '../shell/Text'

type OnboardingButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  testID?: string
  secondary?: boolean
}

export function OnboardingButton({
  label,
  onPress,
  disabled = false,
  testID,
  secondary = false,
}: OnboardingButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`mt-6 rounded-button px-5 py-4 ${secondary ? 'bg-transparent' : 'bg-accent'} ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text
        className={`text-body text-center font-sans-medium ${secondary ? 'text-accent' : 'text-on-accent'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
