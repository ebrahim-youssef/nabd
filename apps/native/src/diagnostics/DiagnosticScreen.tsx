import { SITE_URL } from '@nabd/shared'
import Constants from 'expo-constants'
import * as Localization from 'expo-localization'
import { useEffect, useState } from 'react'
import { I18nManager, Text, View } from 'react-native'

import { openMigratedDatabase } from '../db/database'

export type DiagnosticScreenProps = {
  loadSchemaVersion?: () => Promise<number>
  sdkVersion?: string
}

const defaultLoadSchemaVersion = async () => (await openMigratedDatabase()).version

// Shown when the SDK version cannot be read. This screen exists to tell the truth about a build,
// so an unknown version must read as unknown; a hardcoded fallback would report a version the
// build does not have.
const UNKNOWN_SDK_VERSION = 'غير معروف'

const defaultSdkVersion = () => Constants.expoConfig?.sdkVersion ?? UNKNOWN_SDK_VERSION

export function DiagnosticScreen({
  loadSchemaVersion = defaultLoadSchemaVersion,
  sdkVersion = defaultSdkVersion(),
}: DiagnosticScreenProps) {
  const [schemaVersion, setSchemaVersion] = useState<string>('جارٍ الفحص…')
  const locale = Localization.getLocales()[0]?.languageTag ?? 'ar'
  const direction = I18nManager.isRTL ? 'RTL' : 'LTR'

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

  return (
    <View className="flex-1 bg-background px-6 py-12" testID="diagnostic-screen">
      <Text className="text-title text-primary">نبض · فحص التشغيل</Text>
      <Text className="mt-6 text-body text-foreground">إصدار Expo SDK: {sdkVersion}</Text>
      <Text className="mt-2 text-body text-foreground">اللغة: {locale}</Text>
      <Text className="mt-2 text-body text-foreground">اتجاه العرض: {direction}</Text>
      <Text className="mt-2 text-body text-foreground">الحزمة المشتركة: {SITE_URL}</Text>
      <Text className="mt-2 text-body text-foreground">إصدار قاعدة البيانات: {schemaVersion}</Text>
    </View>
  )
}
