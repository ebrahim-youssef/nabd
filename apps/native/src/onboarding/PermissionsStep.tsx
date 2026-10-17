import { ONBOARDING_COPY } from '@nabd/shared'
import { Switch, View } from 'react-native'

import { deviceCopy } from '../device/copy'
import { useLocationCapability } from '../device/useLocationCapability'
import {
  useNotificationSettings,
  type NotificationMomentKey,
} from '../device/useNotificationSettings'
import { Text } from '../shell/Text'
import { NATIVE_ONBOARDING_COPY } from './copy'
import { OnboardingButton } from './OnboardingButton'

const NOTIFICATION_MOMENTS: readonly { key: NotificationMomentKey; label: string }[] = [
  { key: 'beforeAdhan', label: ONBOARDING_COPY.momentBefore },
  { key: 'atAdhan', label: ONBOARDING_COPY.momentAdhan },
  { key: 'atIqamah', label: ONBOARDING_COPY.momentIqamah },
  { key: 'morningAdhkar', label: ONBOARDING_COPY.momentMorningAdhkar },
  { key: 'eveningAdhkar', label: ONBOARDING_COPY.momentEveningAdhkar },
]

type LocationView = ReturnType<typeof useLocationCapability>
type NotificationView = ReturnType<typeof useNotificationSettings>

type PermissionsStepProps = {
  location: LocationView
  notifications: NotificationView
  isFinalStep: boolean
  onContinue: () => void
}

function LocationSetup({ location }: { location: LocationView }) {
  const ready = location.status.state === 'ready'
  const actionLabel =
    location.status.action?.type === 'retry-location'
      ? ONBOARDING_COPY.locationButton
      : (location.status.action?.label ?? ONBOARDING_COPY.locationButton)

  return (
    <View className="gap-3 rounded-card border border-border bg-surface p-4">
      <Text className="text-body text-start font-body-medium text-foreground">
        {ONBOARDING_COPY.locationHeading}
      </Text>
      <Text className="text-small text-start text-muted-foreground">
        {ONBOARDING_COPY.locationBody}
      </Text>
      {ready ? (
        <Text className="text-small text-start font-body-medium text-primary">
          {ONBOARDING_COPY.locationGranted}
        </Text>
      ) : (
        <>
          <OnboardingButton
            label={actionLabel}
            onPress={() => void location.runAction()}
            testID="onboarding-location"
          />
          <Text className="text-small text-start text-gold" testID="onboarding-location-message">
            {location.status.message}
          </Text>
        </>
      )}
    </View>
  )
}

function NotificationSetup({ notifications }: { notifications: NotificationView }) {
  const showMoments = notifications.permission === 'granted' && notifications.prefs.enabled
  const showDenied = notifications.permission === 'denied'
  const showBlocked = notifications.permission === 'blocked'

  return (
    <View className="gap-3 rounded-card border border-border bg-surface p-4">
      <Text className="text-body text-start font-body-medium text-foreground">
        {ONBOARDING_COPY.notificationsHeading}
      </Text>
      <Text className="text-small text-start text-muted-foreground">
        {ONBOARDING_COPY.notificationsBody}
      </Text>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-body flex-1 text-start text-foreground">
          {ONBOARDING_COPY.notificationsToggle}
        </Text>
        <Switch
          accessibilityLabel={ONBOARDING_COPY.notificationsToggle}
          accessibilityRole="switch"
          accessibilityState={{ checked: notifications.prefs.enabled }}
          onValueChange={(value) => void notifications.setEnabled(value)}
          testID="onboarding-notifications"
          value={notifications.prefs.enabled}
        />
      </View>
      {showDenied ? (
        <>
          <Text
            className="text-small text-start text-gold"
            testID="onboarding-notifications-denied"
          >
            {NATIVE_ONBOARDING_COPY.notificationsDenied}
          </Text>
          <OnboardingButton
            label={deviceCopy.actions.retry}
            onPress={() => void notifications.runAction('request-notification-permission')}
            testID="onboarding-notifications-retry"
          />
        </>
      ) : null}
      {showBlocked ? (
        <>
          <Text className="text-small text-start text-gold">
            {notifications.notificationStatus.message}
          </Text>
          <OnboardingButton
            label={deviceCopy.actions.openAppSettings}
            onPress={() => void notifications.runAction('open-app-settings')}
            testID="onboarding-notifications-settings"
          />
        </>
      ) : null}
      {showMoments ? (
        <View className="gap-2 ps-7" testID="onboarding-notification-moments">
          {NOTIFICATION_MOMENTS.map((moment) => (
            <View className="flex-row items-center justify-between gap-3" key={moment.key}>
              <Text className="text-small flex-1 text-start text-foreground">{moment.label}</Text>
              <Switch
                accessibilityLabel={moment.label}
                accessibilityRole="switch"
                accessibilityState={{ checked: notifications.prefs[moment.key] }}
                onValueChange={(value) => void notifications.setMoment(moment.key, value)}
                testID={`onboarding-moment-${moment.key}`}
                value={notifications.prefs[moment.key]}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function PermissionsStep({
  location,
  notifications,
  isFinalStep,
  onContinue,
}: PermissionsStepProps) {
  return (
    <View testID="onboarding-permissions">
      <Text accessibilityRole="header" className="font-display text-title text-start text-primary">
        {ONBOARDING_COPY.permissionsTitle}
      </Text>
      <View className="mt-6 gap-4">
        <LocationSetup location={location} />
        <NotificationSetup notifications={notifications} />
      </View>
      <OnboardingButton
        label={isFinalStep ? ONBOARDING_COPY.finish : ONBOARDING_COPY.confirm}
        onPress={onContinue}
        testID="onboarding-permissions-continue"
      />
    </View>
  )
}
