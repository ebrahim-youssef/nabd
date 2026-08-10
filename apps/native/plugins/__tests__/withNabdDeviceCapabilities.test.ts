const plugin = require('../withNabdDeviceCapabilities.cjs') as {
  _internals: {
    PERMISSIONS: string[]
    AUDIO_FILES: string[]
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
  it('declares the exact device-capability permission set', () => {
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

  it('copies the four reference audio files without transformation', () => {
    expect(plugin._internals.AUDIO_FILES).toEqual([
      'adhan_fajr.mp3',
      'adhan.mp3',
      'before.mp3',
      'iqama.mp3',
    ])
  })

  it('adds an idempotent non-exported boot receiver', () => {
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
  // Runs the real transformation against a manifest shaped like the one expo prebuild produces.
  // The first version of this plugin called AndroidConfig.Manifest.addUsesPermission, which does
  // not exist; prebuild failed while every test above still passed.
  const emptyManifest = () => ({
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      'uses-permission': [],
      application: [{ $: { 'android:name': '.MainApplication' } }],
    },
  })

  it('adds every declared permission and both receivers', () => {
    const manifest = emptyManifest()
    plugin._internals.applyManifest(manifest)

    const declared = manifest.manifest['uses-permission'].map(
      (entry: { $: Record<string, string> }) => entry.$['android:name'],
    )
    for (const permission of plugin._internals.PERMISSIONS) {
      expect(declared).toContain(permission)
    }

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
