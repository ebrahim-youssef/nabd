import { registerPlugin } from '@capacitor/core'

// Bridge to the app-local Android LocationEnablerPlugin (NBD-63). enable() pops the Google
// Play Services in-app "turn on location" dialog when the device GPS toggle is off and resolves
// whether location is now on. Web / any platform without the native plugin rejects — callers
// treat a rejection as "can't prompt here" and fall through to the normal flow.
export interface LocationEnablerPlugin {
  enable(): Promise<{ enabled: boolean }>
}

export const LocationEnabler = registerPlugin<LocationEnablerPlugin>('LocationEnabler')

// Asks the OS to turn on location services in-app. Returns true if location is on afterwards
// (or already was), false if the user declined the dialog. Resolves true when the native plugin
// is unavailable (older APK / non-native) so it never blocks the existing getCurrentPosition path.
export async function promptEnableLocation(): Promise<boolean> {
  try {
    const { enabled } = await LocationEnabler.enable()
    return enabled
  } catch {
    return true
  }
}
