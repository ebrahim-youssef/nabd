const plugin = require('../withNabdDeviceCapabilities.cjs') as {
  _internals: {
    PERMISSIONS: string[]
    CHANNEL_IDS: string[]
    addReceiver: (
      application: { receiver?: Array<Record<string, unknown>> },
      name: string,
      exported: boolean,
      actions?: string[],
    ) => void
    applyManifest: (androidManifest: {
      manifest: Record<string, unknown> & {
        'uses-permission': Array<{ $: Record<string, string> }>
        application: Array<{ receiver?: Array<{ $: Record<string, string> }> }>
      }
    }) => void
  }
}

describe('Nabd device capabilities config plugin', () => {
  it('declares the Android permissions required by the capability module', () => {
    expect(plugin._internals.PERMISSIONS).toEqual([
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ])
  })

  it('exposes immutable, versioned notification channels', () => {
    expect(plugin._internals.CHANNEL_IDS).toEqual([
      'nabd-prayer-before-v1',
      'nabd-prayer-adhan-v1',
      'nabd-prayer-fajr-v1',
      'nabd-prayer-iqamah-v1',
      'nabd-adhkar-reminder-v1',
      'nabd-countdown-v1',
    ])
  })

  it('adds an idempotent non-exported receiver for boot re-arming', () => {
    const application: { receiver?: Array<Record<string, unknown>> } = {}
    plugin._internals.addReceiver(application, 'com.nabd.capabilities.AlarmBootReceiver', false, [
      'android.intent.action.BOOT_COMPLETED',
    ])
    plugin._internals.addReceiver(application, 'com.nabd.capabilities.AlarmBootReceiver', false, [
      'android.intent.action.BOOT_COMPLETED',
    ])

    expect(application.receiver).toHaveLength(1)
    expect(application.receiver?.[0]).toMatchObject({
      $: {
        'android:name': 'com.nabd.capabilities.AlarmBootReceiver',
        'android:exported': 'false',
      },
    })
  })
})

describe('manifest transformation', () => {
  const emptyManifest = () => ({
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      'uses-permission': [],
      application: [{ $: { 'android:name': '.MainApplication' } }],
    },
  })

  it('adds every permission and both alarm receivers', () => {
    const manifest = emptyManifest()
    plugin._internals.applyManifest(manifest)

    const declared = manifest.manifest['uses-permission'].map(
      (entry: { $: Record<string, string> }) => entry.$['android:name'],
    )
    expect(declared).toEqual(plugin._internals.PERMISSIONS)
    expect(
      manifest.manifest['uses-permission'].find(
        (entry: { $: Record<string, string> }) =>
          entry.$['android:name'] === 'android.permission.SCHEDULE_EXACT_ALARM',
      )?.$['android:maxSdkVersion'],
    ).toBe('32')

    const receivers = manifest.manifest.application[0].receiver ?? []
    expect(
      receivers.map((entry: { $: Record<string, string> }) => entry.$['android:name']),
    ).toEqual([
      'com.nabd.capabilities.PrayerAlarmReceiver',
      'com.nabd.capabilities.AlarmBootReceiver',
    ])
  })

  it('is idempotent across repeated prebuilds', () => {
    const manifest = emptyManifest()
    plugin._internals.applyManifest(manifest)
    plugin._internals.applyManifest(manifest)

    expect(manifest.manifest['uses-permission']).toHaveLength(plugin._internals.PERMISSIONS.length)
    expect(manifest.manifest.application[0].receiver).toHaveLength(2)
  })
})
