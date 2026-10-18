import { Pressable } from 'react-native'

import { Text } from '../shell/Text'

type OnboardingButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  testID?: string
}

export function OnboardingButton({
  label,
  onPress,
  disabled = false,
  testID,
}: OnboardingButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`mt-6 rounded-button bg-primary px-5 py-4 ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text className="text-body text-center font-body-medium text-primary-foreground">
        {label}
      </Text>
    </Pressable>
  )
}
