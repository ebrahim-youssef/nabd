import '../global.css'

import { Stack } from 'expo-router'
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite'
import { useColorScheme } from 'nativewind'
import { I18nManager } from 'react-native'
import { useEffect, useMemo } from 'react'

import { DATABASE_NAME, migrateDatabase } from '../src/db/database'
import { initializeSentry, Sentry } from '../src/observability/sentry'
import {
  createPreferencesRepository,
  PREFERENCE_KEYS,
  readStoredTheme,
} from '../src/preferences/db'

initializeSentry()
I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

function NativeAppearanceBootstrap() {
  const database = useSQLiteContext()
  const { setColorScheme } = useColorScheme()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])

  useEffect(() => {
    let active = true
    void preferences.read(PREFERENCE_KEYS.theme).then((stored) => {
      if (active) setColorScheme(readStoredTheme(stored))
    })
    return () => {
      active = false
    }
  }, [preferences, setColorScheme])

  return null
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
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  )
}

export default Sentry.wrap(RootLayout)
