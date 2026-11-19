import { COPY as ONBOARDING_COPY } from './copy'
import { View } from 'react-native'

import type { BatteryOptimizationStatus } from '../device/types'
import { NATIVE_SETTINGS_COPY } from '../settings/constants'
import { Text } from '../shell/Text'
import { OnboardingButton } from './OnboardingButton'

type PowerStepProps = {
  status: BatteryOptimizationStatus
  onRequest: () => void
  onFinish: () => void
}

export function PowerStep({ status, onRequest, onFinish }: PowerStepProps) {
  return (
    <View testID="onboarding-power">
      <Text
        accessibilityRole="header"
        className="font-display text-sheet-title text-start text-accent"
      >
        {ONBOARDING_COPY.powerTitle}
      </Text>
      <View className="mt-6 gap-3 rounded-card border border-line bg-surface p-4">
        <Text className="text-body text-start font-sans-medium text-ink">
          {ONBOARDING_COPY.powerBody}
        </Text>
        <View className="gap-1 ps-5">
          {ONBOARDING_COPY.powerSteps.map((step) => (
            <Text className="text-meta text-start text-ink" key={step}>
              {step}
            </Text>
          ))}
        </View>
        {status === 'optimized' ? (
          <OnboardingButton
            label={ONBOARDING_COPY.powerButton}
            onPress={onRequest}
            testID="onboarding-power-enable"
          />
        ) : status === 'exempt' ? (
          <Text className="text-body text-start text-ink" testID="onboarding-power-protected">
            {NATIVE_SETTINGS_COPY.battery.protectionEnabled}
          </Text>
        ) : null}
      </View>
      <OnboardingButton
        label={ONBOARDING_COPY.finish}
        onPress={onFinish}
        testID="onboarding-finish"
      />
    </View>
  )
}
