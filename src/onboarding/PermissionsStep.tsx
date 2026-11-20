import { COPY as ONBOARDING_COPY } from './copy'
import { useState } from 'react'
import { Switch, View } from 'react-native'

import { deviceCopy } from '../device/copy'
import { useLocationCapability } from '../device/useLocationCapability'
import { useNotificationSettings } from '../device/useNotificationSettings'
import { Text } from '../shell/Text'
import { NATIVE_ONBOARDING_COPY } from './copy'
import { OnboardingButton } from './OnboardingButton'

type LocationView = ReturnType<typeof useLocationCapability>
type NotificationView = ReturnType<typeof useNotificationSettings>

type PermissionsStepProps = {
  location: LocationView
  notifications: NotificationView
  onContinue: () => void
}

function LocationSetup({ location }: { location: LocationView }) {
  const ready = location.status.state === 'ready'
  const showMessage =
    location.status.state !== 'permission-required' || location.permission === 'denied'
  const actionLabel =
    location.status.action?.type === 'retry-location'
      ? ONBOARDING_COPY.locationButton
      : (location.status.action?.label ?? ONBOARDING_COPY.locationButton)

  return (
    <View className="gap-3 rounded-card border border-line bg-surface p-4">
      <Text className="text-body text-start font-sans-medium text-ink">
        {ONBOARDING_COPY.locationHeading}
      </Text>
      <Text className="text-meta text-start text-ink">{ONBOARDING_COPY.locationBody}</Text>
      {ready ? (
        <Text className="text-meta text-start font-sans-medium text-accent">
          {ONBOARDING_COPY.locationGranted}
        </Text>
      ) : (
        <>
          <OnboardingButton
            label={actionLabel}
            onPress={() => void location.runAction()}
            testID="onboarding-location"
          />
          {showMessage ? (
            <Text
              className="text-meta text-start text-gold-ink"
              testID="onboarding-location-message"
            >
              {location.status.message}
            </Text>
          ) : null}
        </>
      )}
    </View>
  )
}

function NotificationSetup({ notifications }: { notifications: NotificationView }) {
  const [notificationRequestDenied, setNotificationRequestDenied] = useState(false)
  const showDenied = notifications.permission === 'denied' && notificationRequestDenied
  const showBlocked = notifications.permission === 'blocked'

  const handleEnabledChange = async (value: boolean) => {
    const permission = await notifications.setEnabled(value)
    if (value && permission === 'denied') setNotificationRequestDenied(true)
  }

  return (
    <View className="gap-3 rounded-card border border-line bg-surface p-4">
      <Text className="text-body text-start font-sans-medium text-ink">
        {ONBOARDING_COPY.notificationsHeading}
      </Text>
      <Text className="text-meta text-start text-ink">{ONBOARDING_COPY.notificationsBody}</Text>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-body flex-1 text-start text-ink">
          {ONBOARDING_COPY.notificationsToggle}
        </Text>
        <Switch
          accessibilityLabel={ONBOARDING_COPY.notificationsToggle}
          accessibilityRole="switch"
          accessibilityState={{
            checked: notifications.prefs.enabled,
            disabled: showBlocked,
          }}
          disabled={showBlocked}
          onValueChange={handleEnabledChange}
          testID="onboarding-notifications"
          value={notifications.prefs.enabled}
        />
      </View>
      {showDenied ? (
        <>
          <Text
            className="text-meta text-start text-gold-ink"
            testID="onboarding-notifications-denied"
          >
            {NATIVE_ONBOARDING_COPY.notificationsDenied}
          </Text>
          <OnboardingButton
            label={deviceCopy.actions.retry}
            onPress={() => void notifications.setEnabled(true)}
            testID="onboarding-notifications-retry"
          />
        </>
      ) : null}
      {showBlocked ? (
        <>
          <Text className="text-meta text-start text-gold-ink">
            {notifications.notificationStatus.message}
          </Text>
          <OnboardingButton
            label={deviceCopy.actions.openAppSettings}
            onPress={() => void notifications.runAction('open-app-settings')}
            testID="onboarding-notifications-settings"
          />
        </>
      ) : null}
    </View>
  )
}

export function PermissionsStep({ location, notifications, onContinue }: PermissionsStepProps) {
  return (
    <View testID="onboarding-permissions">
      <Text
        accessibilityRole="header"
        className="font-display text-sheet-title text-start text-accent"
      >
        {ONBOARDING_COPY.permissionsTitle}
      </Text>
      <View className="mt-6 gap-4">
        <LocationSetup location={location} />
        <NotificationSetup notifications={notifications} />
      </View>
      <OnboardingButton
        label={ONBOARDING_COPY.confirm}
        onPress={onContinue}
        testID="onboarding-permissions-continue"
      />
    </View>
  )
}
