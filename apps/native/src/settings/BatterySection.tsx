import { ONBOARDING_COPY } from '@nabd/shared'
import { Pressable, View } from 'react-native'

import { useBatteryOptimization } from '../device/useBatteryOptimization'
import { Text } from '../shell/Text'
import { NATIVE_SETTINGS_COPY } from './constants'

export function BatterySection() {
  const { status, request } = useBatteryOptimization()

  if (status === 'unsupported') return null

  return (
    <View className="gap-3" testID="settings-battery">
      <Text
        accessibilityRole="header"
        className="font-display text-label text-start text-muted-foreground"
      >
        {ONBOARDING_COPY.powerTitle}
      </Text>
      <View className="gap-3 rounded-card border border-border bg-surface p-4 shadow-card-sm">
        {status === 'optimized' ? (
          <>
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
            <Pressable
              accessibilityLabel={ONBOARDING_COPY.powerButton}
              accessibilityRole="button"
              className="rounded-button bg-primary px-4 py-3"
              onPress={request}
              testID="settings-battery-enable"
            >
              <Text className="text-body text-center font-body-medium text-primary-foreground">
                {ONBOARDING_COPY.powerButton}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text
            className="text-body text-start text-foreground"
            testID="settings-battery-protected"
          >
            {NATIVE_SETTINGS_COPY.battery.protectionEnabled}
          </Text>
        )}
      </View>
    </View>
  )
}
