import '../global.css'

import { Stack } from 'expo-router'
import { SQLiteProvider } from 'expo-sqlite'
import { I18nManager } from 'react-native'

import { DATABASE_NAME, migrateDatabase } from '../src/db/database'
import { initializeSentry, Sentry } from '../src/observability/sentry'

initializeSentry()
I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

function RootLayout() {
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={async (database) => {
        await migrateDatabase(database)
      }}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  )
}

export default Sentry.wrap(RootLayout)
