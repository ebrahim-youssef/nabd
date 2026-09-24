import '../global.css'

import { Stack } from 'expo-router'
import { SQLiteProvider } from 'expo-sqlite'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { useCallback, useRef, useState } from 'react'
import { I18nManager } from 'react-native'

import { DATABASE_NAME, migrateDatabase } from '../src/db/database'
import { PrayerAlarmsBootstrap } from '../src/device/usePrayerAlarms'
import { logger } from '../src/observability/logger'
import { DatabaseError, DatabaseLoading } from '../src/shell/DatabaseStatus'

I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

type DatabaseStatus = 'loading' | 'ready' | 'error'

function RootLayout() {
  const { colorScheme } = useColorScheme()
  const [status, setStatus] = useState<DatabaseStatus>('loading')
  const [attempt, setAttempt] = useState(0)
  const openErrorScheduled = useRef(false)

  const initializeDatabase = useCallback(
    async (database: Parameters<typeof migrateDatabase>[0]) => {
      try {
        await migrateDatabase(database)
        setStatus('ready')
      } catch (cause) {
        logger.error('Native database migration failed', cause)
        setStatus('error')
      }
    },
    [],
  )

  const handleOpenError = useCallback((cause: Error) => {
    if (openErrorScheduled.current) return
    openErrorScheduled.current = true
    queueMicrotask(() => {
      logger.error('Native database open failed', cause)
      setStatus('error')
    })
  }, [])

  const retry = useCallback(() => {
    openErrorScheduled.current = false
    setStatus('loading')
    setAttempt((current) => current + 1)
  }, [])

  if (status === 'error') return <DatabaseError onRetry={retry} />

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {status === 'loading' ? <DatabaseLoading /> : null}
      <SQLiteProvider
        key={attempt}
        databaseName={DATABASE_NAME}
        onError={handleOpenError}
        onInit={initializeDatabase}
      >
        <PrayerAlarmsBootstrap />
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
    </>
  )
}

export default RootLayout
