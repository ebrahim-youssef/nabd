import { Tabs } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useColorScheme } from 'nativewind'
import { useEffect, useMemo } from 'react'

import { BottomNav } from '../../src/shell/BottomNav'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../src/preferences/db'
import { readStoredTheme } from '../../src/preferences/theme'
import { logger } from '../../src/observability/logger'
import { DatabaseError } from '../../src/shell/DatabaseStatus'

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

function TabsContent() {
  return (
    <>
      <NativeAppearanceBootstrap />
      <Tabs screenOptions={{ headerShown: false }} tabBar={() => <BottomNav />} />
    </>
  )
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    logger.error('Native database route failed', error)
  }, [error])

  return <DatabaseError onRetry={retry} />
}

export default function TabsLayout() {
  return <TabsContent />
}
