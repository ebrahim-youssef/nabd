type MinimalManifest = {
  manifest: {
    'uses-permission': Array<{ $: Record<string, string> }>
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
    ])
    expect(entries[1].$['android:maxSdkVersion']).toBe('32')
    expect(plugin._internals.PERMISSIONS).toHaveLength(2)
  })

  it('does not duplicate permissions or lose the cap when applied twice', () => {
    const manifest = emptyManifest()
    plugin._internals.applyManifest(manifest)
    plugin._internals.applyManifest(manifest)

    const entries = manifest.manifest['uses-permission']
    expect(entries).toHaveLength(2)
    expect(entries[1].$['android:maxSdkVersion']).toBe('32')
  })
})
