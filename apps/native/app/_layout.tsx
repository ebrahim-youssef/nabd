import '../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { I18nManager } from 'react-native'

I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default RootLayout
