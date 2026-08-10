import type { NabdDeviceCapabilitiesModule } from '../deviceCapabilities'
import {
  armPrayerAlarms,
  requestForegroundLocation,
  requireNotificationPermission,
  resolveLocationServices,
  syncCountdownNotification,
} from '../deviceCapabilities'

function fakeNative(
  overrides: Partial<NabdDeviceCapabilitiesModule> = {},
): NabdDeviceCapabilitiesModule {
  return {
    getCapabilityStatus: jest.fn(),
    requestNotificationPermission: jest.fn(),
    openApplicationSettings: jest.fn(),
    openExactAlarmSettings: jest.fn(),
    armAlarms: jest.fn(),
    cancelAlarms: jest.fn(),
    enableCountdown: jest.fn(),
    disableCountdown: jest.fn(),
    ensureLocationServices: jest.fn(),
    requestLocation: jest.fn(),
    ...overrides,
  }
}

describe('device capabilities adapter', () => {
  it('maps alarm payload channel keys to stable Android channel ids', async () => {
    const armAlarms = jest.fn().mockResolvedValue({ degraded: false })
    const native = fakeNative({ armAlarms })
    await armPrayerAlarms(
      [{ id: 7, title: 'الفجر', body: 'حي على الصلاة', channelKey: 'adhanFajr', at: 123 }],
      true,
      native,
    )
    expect(armAlarms).toHaveBeenCalledWith({
      alarmOnSilent: true,
      alarms: [expect.objectContaining({ id: 7, channelId: 'prayer-adhan-fajr', at: 123 })],
    })
  })

  it('distinguishes permanent notification denial', async () => {
    const native = fakeNative({
      requestNotificationPermission: jest
        .fn()
        .mockResolvedValue({ permission: 'denied', canAskAgain: false }),
    })
    await expect(requireNotificationPermission(native)).resolves.toBe('permanentlyDenied')
  })

  it('keeps countdown disabled when notification permission is permanently denied', async () => {
    const disableCountdown = jest.fn()
    const enableCountdown = jest.fn()
    const native = fakeNative({
      getCapabilityStatus: jest.fn().mockResolvedValue({
        notificationPermission: 'permanentlyDenied',
        notificationsEnabled: false,
      }),
      disableCountdown,
      enableCountdown,
    })
    await expect(syncCountdownNotification([], null, native)).resolves.toEqual({
      ok: false,
      reason: 'permanentlyDenied',
    })
    expect(disableCountdown).toHaveBeenCalled()
    expect(enableCountdown).not.toHaveBeenCalled()
  })

  it('does not conflate a disabled GPS service with denied app permission', async () => {
    const native = fakeNative({
      ensureLocationServices: jest.fn().mockResolvedValue({ enabled: false }),
    })
    await expect(resolveLocationServices(native)).resolves.toEqual({
      ok: false,
      reason: 'servicesDisabled',
    })
  })

  it('resolves GPS services before requesting foreground permission and a fix', async () => {
    const calls: string[] = []
    const native = fakeNative({
      ensureLocationServices: jest.fn(async () => {
        calls.push('services')
        return { enabled: true }
      }),
      requestLocation: jest.fn(async () => {
        calls.push('location')
        return {
          ok: true as const,
          coords: { latitude: 30, longitude: 31 },
          cached: false,
        }
      }),
    })
    await expect(requestForegroundLocation(native)).resolves.toMatchObject({ ok: true })
    expect(calls).toEqual(['services', 'location'])
  })

  it('does not request permission when the GPS resolution is declined', async () => {
    const requestLocation = jest.fn()
    const native = fakeNative({
      ensureLocationServices: jest.fn().mockResolvedValue({ enabled: false }),
      requestLocation,
    })
    await expect(requestForegroundLocation(native)).resolves.toEqual({
      ok: false,
      reason: 'servicesDisabled',
    })
    expect(requestLocation).not.toHaveBeenCalled()
  })
})
