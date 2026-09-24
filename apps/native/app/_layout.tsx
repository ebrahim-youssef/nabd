import '../global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'nativewind'
import { I18nManager } from 'react-native'

I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

function RootLayout() {
  const { colorScheme } = useColorScheme()

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default RootLayout
