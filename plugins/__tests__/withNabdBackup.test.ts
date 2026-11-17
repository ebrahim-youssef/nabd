type BackupPlugin = {
  _internals: {
    applyManifest: (manifest: AndroidManifest) => AndroidManifest
    makeDataExtractionRules: () => string
    makeFullBackupContent: () => string
  }
}

type AndroidManifest = {
  manifest: {
    application: Array<{ $: Record<string, string> }>
  }
}

const plugin = require('../withNabdBackup.cjs') as BackupPlugin

describe('withNabdBackup', () => {
  it('sets application backup manifest attributes', () => {
    const manifest: AndroidManifest = {
      manifest: { application: [{ $: { 'android:name': '.MainApplication' } }] },
    }

    plugin._internals.applyManifest(manifest)

    expect(manifest.manifest.application[0].$).toMatchObject({
      'android:allowBackup': 'true',
      'android:fullBackupContent': '@xml/nabd_backup_rules',
      'android:dataExtractionRules': '@xml/nabd_data_extraction_rules',
    })
  })

  it('includes the SQLite files directory and excludes other state from Android 11 and lower', () => {
    const xml = plugin._internals.makeFullBackupContent()

    expect(xml).toContain('<include domain="file" path="SQLite/" />')
    expect(xml).not.toContain('<include domain="database"')
    expect(xml).not.toContain('<exclude domain="file"')
    expect(xml).toContain('<exclude domain="sharedpref" path="." />')
    expect(xml).toContain('<exclude domain="device_sharedpref" path="." />')
    expect(xml).toContain('<exclude domain="device_database" path="." />')
  })

  it('applies the SQLite files inclusion to both Android 12+ transfer types', () => {
    const xml = plugin._internals.makeDataExtractionRules()

    expect(xml).toContain('<cloud-backup>')
    expect(xml).toContain('<device-transfer>')
    expect(xml.match(/<include domain="file" path="SQLite\/" \/>/g)).toHaveLength(2)
    expect(xml).not.toContain('<include domain="database"')
    expect(xml).not.toContain('<exclude domain="file"')
    expect(xml.match(/<exclude domain="sharedpref" path="\." \/>/g)).toHaveLength(2)
    expect(xml).toContain('<exclude domain="device_database" path="." />')
  })
})
