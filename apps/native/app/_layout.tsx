import '../global.css'

import { Stack } from 'expo-router'
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { I18nManager, Text } from 'react-native'
import { useEffect, useMemo, useState } from 'react'

import { DATABASE_NAME, migrateDatabase } from '../src/db/database'
import { initializeSentry, Sentry } from '../src/observability/sentry'
import {
  createPreferencesRepository,
  PREFERENCE_KEYS,
} from '../src/preferences/db'
import { deviceCopy } from '../src/device/copy'
import { readThemeWithFallback } from '../src/app/themeBootstrap'
import { useNativeShell } from '../src/device/useNativeShell'

initializeSentry()
I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

function NativeAppearanceBootstrap() {
  const database = useSQLiteContext()
  const { setColorScheme } = useColorScheme()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const [themeError, setThemeError] = useState<unknown>()

  useEffect(() => {
    let active = true
    void readThemeWithFallback(
      () => preferences.read(PREFERENCE_KEYS.theme),
      (cause) => {
        if (active) setThemeError(cause)
      },
    ).then((theme) => {
      if (active) setColorScheme(theme)
    })
    return () => {
      active = false
    }
  }, [preferences, setColorScheme])

  return themeError ? (
    <Text accessibilityRole="alert" className="text-small text-start text-muted-foreground">
      {deviceCopy.errors.preferencesReadFailed}
    </Text>
  ) : null
}

function RootLayout() {
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={async (database) => {
        await migrateDatabase(database)
      }}
    >
      <NativeAppearanceBootstrap />
      <NativeShellBootstrap />
    </SQLiteProvider>
  )
}

function NativeShellBootstrap() {
  const shell = useNativeShell()
  return (
    <>
      <StatusBar style={shell.statusBarStyle} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default Sentry.wrap(RootLayout)
