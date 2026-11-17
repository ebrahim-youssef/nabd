import { Platform } from 'react-native'

import { androidDevicePlatform } from './android'
import { iosDevicePlatform } from './ios'
import type { DevicePlatform } from './contract'

export { androidDevicePlatform, iosDevicePlatform }
export type { CountdownNotificationResult, DevicePlatform } from './contract'

export function selectDevicePlatform(os: string): DevicePlatform {
  return os === 'android' ? androidDevicePlatform : iosDevicePlatform
}

export const devicePlatform: DevicePlatform = selectDevicePlatform(Platform.OS)
