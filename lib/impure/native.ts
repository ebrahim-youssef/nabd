import { Capacitor } from '@capacitor/core'

// Capacitor platform guard (NBD-46, ADR-0012). The same deployed web code runs in browsers
// and inside the Android shell; native-only paths branch on this. On plain web the bridge
// is absent and this is simply false.
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}
