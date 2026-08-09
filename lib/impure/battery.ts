import { logger } from '@/lib/logger'

import { isNativePlatform } from './native'

// Battery-optimization exemption (NBD-58). OEM battery savers (Xiaomi/HyperOS, Samsung One UI,
// OnePlus, Huawei) throttle background AlarmManager, so an exact prayer alarm can fire late or
// not at all with the app closed. A prayer/azan app is an alarm-core app — a legitimate use
// case for the exemption prompt under Google Play policy. Android-only: every function is a
// no-op on web, and the plugin is imported lazily so it never reaches the web bundle.

async function loadPlugin() {
  const { BatteryOptimization } =
    await import('@capawesome-team/capacitor-android-battery-optimization')
  return BatteryOptimization
}

// Capacitor throws "<method> is not implemented on android" when the running APK was built without
// the native plugin (a stale build predating the plugin wiring — the case behind NBD-69). That is
// expected on old installs, not a code fault, so it should be a warn, not a Sentry error.
function isUnimplemented(cause: unknown): boolean {
  const message = (cause instanceof Error ? cause.message : String(cause)).toLowerCase()
  return message.includes('not implemented') || message.includes('unimplemented')
}

// One place to grade a plugin failure: an unimplemented method (stale APK) is a warn; anything
// else is a real error worth Sentry. Keeps callers simple and the noise policy in one spot.
function logPluginFailure(context: string, cause: unknown): void {
  if (isUnimplemented(cause)) {
    logger.warn(`${context}: native plugin unavailable (stale build?)`, {})
  } else {
    logger.error(`${context} failed`, cause, {})
  }
}

// Whether the OS is currently battery-optimizing نبض (i.e. alarms are at risk). false on web
// or on any error — callers treat it as "nothing to prompt".
export async function isBatteryOptimized(): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    const plugin = await loadPlugin()
    const { enabled } = await plugin.isBatteryOptimizationEnabled()
    return enabled
  } catch (cause) {
    logPluginFailure('battery.isBatteryOptimized', cause)
    return false
  }
}

// Opens the OS battery-optimization settings list so the user can whitelist the app manually.
// Best-effort fallback for the direct-exemption dialog — never throws.
async function openBatterySettingsFallback(): Promise<void> {
  try {
    const plugin = await loadPlugin()
    await plugin.openBatteryOptimizationSettings()
  } catch (cause) {
    logPluginFailure('battery.openBatteryOptimizationSettings', cause)
  }
}

// Must be called from a user gesture (onboarding / settings). Asks the OS to exempt نبض via
// the direct system dialog; some OEM skins reject that intent, so on failure we fall back to
// opening the battery-optimization settings list for a manual whitelist. Best-effort — never
// throws, so onboarding is never blocked on it.
export async function requestBatteryExemption(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    const plugin = await loadPlugin()
    await plugin.requestIgnoreBatteryOptimization()
  } catch (cause) {
    logPluginFailure('battery.requestBatteryExemption', cause)
    // Some OEM skins reject the direct-exemption intent — fall back to the settings list.
    await openBatterySettingsFallback()
  }
}
