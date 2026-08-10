import '../global.css'

import { Stack } from 'expo-router'
import { I18nManager } from 'react-native'

import { Sentry } from '../src/observability/sentry'

I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}

export default Sentry.wrap(RootLayout)
