import Constants from 'expo-constants'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Location from 'expo-location'

import { logger } from '../observability/logger'
import { mapDevicePermission } from './logic'
import type { LocationPermission } from './types'

export const LOCATION_FIX_TIMEOUT_MS = 15_000
const ANDROID_PACKAGE = 'com.nabd.app'

export type LocationFixResult =
  { kind: 'ok'; latitude: number; longitude: number } | { kind: 'timeout' } | { kind: 'error' }

export async function readPermission(): Promise<LocationPermission> {
  return mapDevicePermission(await Location.getForegroundPermissionsAsync())
}

export async function requestPermission(): Promise<LocationPermission> {
  return mapDevicePermission(await Location.requestForegroundPermissionsAsync())
}

export async function servicesEnabled(): Promise<boolean> {
  return Location.hasServicesEnabledAsync()
}

export async function enableServices(): Promise<boolean> {
  try {
    await Location.enableNetworkProviderAsync()
    return true
  } catch (cause: unknown) {
    logger.warn('Native location services dialog was rejected', { error: cause })
    return false
  }
}

function positionResult(): Promise<LocationFixResult> {
  let positionPromise: Promise<Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>>
  try {
    positionPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: false,
    })
  } catch (cause: unknown) {
    logger.warn('Native location fix request failed', { error: cause })
    return Promise.resolve({ kind: 'error' })
  }

  return positionPromise
    .then((position) => ({
      kind: 'ok' as const,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }))
    .catch((cause: unknown) => {
      logger.warn('Native location fix failed', { error: cause })
      return { kind: 'error' as const }
    })
}

export async function getFix(timeoutMs = LOCATION_FIX_TIMEOUT_MS): Promise<LocationFixResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const position = positionResult()
  const timeout = new Promise<LocationFixResult>((resolve) => {
    timeoutId = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs)
  })
  try {
    return await Promise.race([position, timeout])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

export function androidPackage(): string {
  const packageName = Constants.expoConfig?.android?.package
  return typeof packageName === 'string' && packageName.trim() !== ''
    ? packageName
    : ANDROID_PACKAGE
}

export function openAppSettings(): Promise<IntentLauncher.IntentLauncherResult> {
  return IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
    { data: 'package:' + androidPackage() },
  )
}

export function openLocationSettings(): Promise<IntentLauncher.IntentLauncherResult> {
  return IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS)
}
