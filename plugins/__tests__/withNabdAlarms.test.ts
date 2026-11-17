type MinimalManifest = {
  manifest: {
    'uses-permission': Array<{ $: Record<string, string> }>
    application: Array<{
      $: Record<string, string>
      receiver?: Array<{
        $: Record<string, string>
        'intent-filter'?: Array<{ action: Array<{ $: Record<string, string> }> }>
      }>
    }>
  }
}

type NabdAlarmsPlugin = {
  _internals: {
    PERMISSIONS: string[]
    applyManifest: (manifest: MinimalManifest) => MinimalManifest
  }
}

const plugin = require('../withNabdAlarms.cjs') as NabdAlarmsPlugin

const emptyManifest = (): MinimalManifest => ({
  manifest: {
    'uses-permission': [],
    application: [{ $: { 'android:name': '.MainApplication' } }],
  },
})

describe('withNabdAlarms', () => {
  it('adds the exact-alarm permissions and caps the Android 12 permission', () => {
    const manifest = emptyManifest()
    plugin._internals.applyManifest(manifest)

    const entries = manifest.manifest['uses-permission']
    const names = entries.map((entry) => entry.$['android:name'])

    expect(names).toEqual([
      'android.permission.USE_EXACT_ALARM',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ])
    expect(entries[1].$['android:maxSdkVersion']).toBe('32')
    const receivers = manifest.manifest.application[0].receiver ?? []
    expect(receivers.map((receiver) => receiver.$['android:name'])).toEqual([
      'expo.modules.nabddevice.PrayerAlarmReceiver',
      'expo.modules.nabddevice.SystemTimeReceiver',
    ])
    expect(receivers[0].$['android:exported']).toBe('false')
    expect(receivers[1].$['android:exported']).toBe('true')
    expect(
      receivers[1]['intent-filter']?.[0].action.map((action) => action.$['android:name']),
    ).toEqual([
      'android.intent.action.BOOT_COMPLETED',
      'android.intent.action.TIME_SET',
      'android.intent.action.TIMEZONE_CHANGED',
      'android.intent.action.MY_PACKAGE_REPLACED',
      'android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED',
    ])
    expect(plugin._internals.PERMISSIONS).toHaveLength(4)
  })

  it('does not duplicate permissions or lose the cap when applied twice', () => {
    const manifest = emptyManifest()
    plugin._internals.applyManifest(manifest)
    plugin._internals.applyManifest(manifest)

    const entries = manifest.manifest['uses-permission']
    expect(entries).toHaveLength(4)
    expect(entries[1].$['android:maxSdkVersion']).toBe('32')
    expect(manifest.manifest.application[0].receiver).toHaveLength(2)
  })
})
