import { SITE_URL } from '@nabd/shared'
import Constants from 'expo-constants'
import * as Localization from 'expo-localization'
import { useEffect, useState } from 'react'
import { I18nManager, Pressable, Text, View } from 'react-native'

import { openMigratedDatabase } from '../db/database'
import { deviceCapabilities, type CapabilityStatus } from '../native/deviceCapabilities'

export type DiagnosticScreenProps = {
  loadSchemaVersion?: () => Promise<number>
  sdkVersion?: string
  loadCapabilityStatus?: () => Promise<CapabilityStatus>
  openApplicationSettings?: () => Promise<void>
  openExactAlarmSettings?: () => Promise<void>
}

const defaultLoadSchemaVersion = async () => (await openMigratedDatabase()).version
const defaultLoadCapabilityStatus = () => deviceCapabilities.getCapabilityStatus()

const PERMISSION_LABELS = {
  notAsked: 'لم تُطلب',
  granted: 'ممنوحة',
  denied: 'مرفوضة',
  permanentlyDenied: 'مرفوضة نهائيًا · افتح إعدادات التطبيق',
} as const

const ALARM_CHANNEL_LABELS = {
  notCreated: 'لم تُنشأ',
  ready: 'جاهزة',
  degraded: 'وضع منخفض · راجع إعدادات الصوت',
} as const

const initialCapabilityStatus = 'جارٍ الفحص…'

// Shown when the SDK version cannot be read. This screen exists to tell the truth about a build,
// so an unknown version must read as unknown; a hardcoded fallback would report a version the
// build does not have.
const UNKNOWN_SDK_VERSION = 'غير معروف'

const defaultSdkVersion = () => Constants.expoConfig?.sdkVersion ?? UNKNOWN_SDK_VERSION

export function DiagnosticScreen({
  loadSchemaVersion = defaultLoadSchemaVersion,
  sdkVersion = defaultSdkVersion(),
  loadCapabilityStatus = defaultLoadCapabilityStatus,
  openApplicationSettings = () => deviceCapabilities.openApplicationSettings(),
  openExactAlarmSettings = () => deviceCapabilities.openExactAlarmSettings(),
}: DiagnosticScreenProps) {
  const [schemaVersion, setSchemaVersion] = useState<string>('جارٍ الفحص…')
  const locale = Localization.getLocales()[0]?.languageTag ?? 'ar'
  const direction = I18nManager.isRTL ? 'RTL' : 'LTR'
  const [capabilities, setCapabilities] = useState<CapabilityStatus | null>(null)
  const [capabilityError, setCapabilityError] = useState(false)

  useEffect(() => {
    let active = true
    void loadSchemaVersion()
      .then((version) => {
        if (active) setSchemaVersion(String(version))
      })
      .catch(() => {
        if (active) setSchemaVersion('تعذّر الفحص')
      })
    return () => {
      active = false
    }
  }, [loadSchemaVersion])

  useEffect(() => {
    let active = true
    void loadCapabilityStatus()
      .then((status) => {
        if (active) setCapabilities(status)
      })
      .catch(() => {
        if (active) setCapabilityError(true)
      })
    return () => {
      active = false
    }
  }, [loadCapabilityStatus])

  const state = (value: boolean | undefined) =>
    value === undefined ? initialCapabilityStatus : value ? 'متاح' : 'غير متاح'
  const capabilityFallback = capabilityError ? 'تعذّر الفحص' : initialCapabilityStatus

  return (
    <View className="flex-1 bg-background px-6 py-12" testID="diagnostic-screen">
      <Text className="text-title text-primary">نبض · فحص التشغيل</Text>
      <Text className="mt-6 text-body text-foreground">إصدار Expo SDK: {sdkVersion}</Text>
      <Text className="mt-2 text-body text-foreground">اللغة: {locale}</Text>
      <Text className="mt-2 text-body text-foreground">اتجاه العرض: {direction}</Text>
      <Text className="mt-2 text-body text-foreground">الحزمة المشتركة: {SITE_URL}</Text>
      <Text className="mt-2 text-body text-foreground">إصدار قاعدة البيانات: {schemaVersion}</Text>
      <Text className="mt-6 text-title text-primary">قدرات الجهاز</Text>
      <Text className="mt-2 text-body text-foreground">
        إذن الإشعارات:{' '}
        {capabilities ? PERMISSION_LABELS[capabilities.notificationPermission] : capabilityFallback}
      </Text>
      <Text className="mt-2 text-body text-foreground">
        إشعارات النظام: {state(capabilities?.notificationsEnabled)}
      </Text>
      <Text className="mt-2 text-body text-foreground">
        المنبّهات الدقيقة: {state(capabilities?.exactAlarmAccess)}
      </Text>
      <Text className="mt-2 text-body text-foreground">
        الأذان في الوضع الصامت:{' '}
        {capabilities ? ALARM_CHANNEL_LABELS[capabilities.alarmChannels] : capabilityFallback}
      </Text>
      <Text className="mt-2 text-body text-foreground">
        إشعار العدّ التنازلي:{' '}
        {capabilities ? (capabilities.countdownEnabled ? 'مفعّل' : 'متوقف') : capabilityFallback}
      </Text>
      <Text className="mt-2 text-body text-foreground">
        إذن الموقع:{' '}
        {capabilities ? PERMISSION_LABELS[capabilities.locationPermission] : capabilityFallback}
      </Text>
      <Text className="mt-2 text-body text-foreground">
        خدمة GPS: {state(capabilities?.locationServicesEnabled)}
      </Text>
      {capabilities &&
      (capabilities.notificationPermission === 'permanentlyDenied' ||
        capabilities.locationPermission === 'permanentlyDenied') ? (
        <Pressable
          accessibilityRole="button"
          className="mt-4 rounded bg-primary px-4 py-3"
          onPress={() => void openApplicationSettings()}
        >
          <Text className="text-body text-background">فتح إعدادات التطبيق</Text>
        </Pressable>
      ) : null}
      {capabilities && !capabilities.exactAlarmAccess ? (
        <Pressable
          accessibilityRole="button"
          className="mt-3 rounded bg-primary px-4 py-3"
          onPress={() => void openExactAlarmSettings()}
        >
          <Text className="text-body text-background">السماح بالمنبّهات الدقيقة</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
