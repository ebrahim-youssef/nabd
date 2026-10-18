import { ONBOARDING_COPY } from '@nabd/shared'
import { View } from 'react-native'

import { Text } from '../shell/Text'
import { OnboardingButton } from './OnboardingButton'

type PowerStepProps = {
  onRequest: () => void
  onFinish: () => void
}

export function PowerStep({ onRequest, onFinish }: PowerStepProps) {
  return (
    <View testID="onboarding-power">
      <Text accessibilityRole="header" className="font-display text-title text-start text-primary">
        {ONBOARDING_COPY.powerTitle}
      </Text>
      <View className="mt-6 gap-3 rounded-card border border-border bg-surface p-4">
        <Text className="text-body text-start font-body-medium text-foreground">
          {ONBOARDING_COPY.powerBody}
        </Text>
        <View className="gap-1 ps-5">
          {ONBOARDING_COPY.powerSteps.map((step) => (
            <Text className="text-small text-start text-muted-foreground" key={step}>
              {step}
            </Text>
          ))}
        </View>
        <OnboardingButton
          label={ONBOARDING_COPY.powerButton}
          onPress={onRequest}
          testID="onboarding-power-enable"
        />
      </View>
      <OnboardingButton
        label={ONBOARDING_COPY.finish}
        onPress={onFinish}
        testID="onboarding-finish"
      />
    </View>
  )
}
