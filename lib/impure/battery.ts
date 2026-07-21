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

// Whether the OS is currently battery-optimizing نبض (i.e. alarms are at risk). false on web
// or on any error — callers treat it as "nothing to prompt".
export async function isBatteryOptimized(): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    const plugin = await loadPlugin()
    const { enabled } = await plugin.isBatteryOptimizationEnabled()
    return enabled
  } catch (cause) {
    logger.error('battery.isBatteryOptimized failed', cause, {})
    return false
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
    logger.error('battery.requestBatteryExemption failed', cause, {})
    try {
      const plugin = await loadPlugin()
      await plugin.openBatteryOptimizationSettings()
    } catch (fallbackCause) {
      logger.error('battery.openBatteryOptimizationSettings failed', fallbackCause, {})
    }
  }
}
