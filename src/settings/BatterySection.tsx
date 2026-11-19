import { COPY as ONBOARDING_COPY } from '../onboarding/copy'
import { Pressable, View } from 'react-native'

import { useBatteryOptimization } from '../device/useBatteryOptimization'
import { Text } from '../shell/Text'
import { NATIVE_SETTINGS_COPY } from './constants'

export function BatterySection() {
  const { status, request } = useBatteryOptimization()

  if (status === 'unsupported') return null

  return (
    <View className="gap-3" testID="settings-battery">
      <Text accessibilityRole="header" className="font-sans-bold text-chip text-start text-ink">
        {ONBOARDING_COPY.powerTitle}
      </Text>
      <View className="gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        {status === 'optimized' ? (
          <>
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
            <Pressable
              accessibilityLabel={ONBOARDING_COPY.powerButton}
              accessibilityRole="button"
              className="rounded-button bg-accent px-4 py-3"
              onPress={request}
              testID="settings-battery-enable"
            >
              <Text className="text-body text-center font-sans-medium text-on-accent">
                {ONBOARDING_COPY.powerButton}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text className="text-body text-start text-ink" testID="settings-battery-protected">
            {NATIVE_SETTINGS_COPY.battery.protectionEnabled}
          </Text>
        )}
      </View>
    </View>
  )
}
