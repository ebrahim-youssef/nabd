import SplashScreen from 'expo-splash-screen'
import { useRouter } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { useEffect, useState } from 'react'
import { BackHandler } from 'react-native'

import nabdDeviceCapabilities from '../../modules/nabd-device-capabilities'

export type NativeShellState = {
  ready: boolean
  statusBarStyle: 'light' | 'dark'
}

const restoreAfterBootDefault = () => nabdDeviceCapabilities.restoreAfterBoot()

export function useNativeShell(
  restoreAfterBoot: () => Promise<void> = restoreAfterBootDefault,
): NativeShellState {
  const router = useRouter()
  const { colorScheme } = useColorScheme()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    void SplashScreen.preventAutoHideAsync().catch(() => undefined)
    void restoreAfterBoot()
      .catch(() => undefined)
      .finally(() => {
        if (!active) return
        setReady(true)
        void SplashScreen.hideAsync().catch(() => undefined)
      })

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!router.canGoBack()) return false
      router.back()
      return true
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [restoreAfterBoot, router])

  return {
    ready,
    statusBarStyle: colorScheme === 'dark' ? 'light' : 'dark',
  }
}
