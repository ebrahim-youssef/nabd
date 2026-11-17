const fs = require('node:fs/promises')
const path = require('node:path')
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins')

const FULL_BACKUP_CONTENT = 'nabd_backup_rules'
const DATA_EXTRACTION_RULES = 'nabd_data_extraction_rules'
const BACKUP_EXCLUDES = [
  ['sharedpref', '.'],
  ['device_sharedpref', '.'],
  ['device_file', '.'],
  ['device_database', '.'],
  ['device_root', '.'],
]

function makeFullBackupContent() {
  const exclusions = BACKUP_EXCLUDES.map(
    ([domain, filePath]) => `  <exclude domain="${domain}" path="${filePath}" />`,
  ).join('\n')
  return `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n  <include domain="file" path="SQLite/" />\n${exclusions}\n</full-backup-content>\n`
}

function makeDataExtractionRules() {
  const exclusions = BACKUP_EXCLUDES.map(
    ([domain, filePath]) => `    <exclude domain="${domain}" path="${filePath}" />`,
  ).join('\n')
  return `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n    <include domain="file" path="SQLite/" />\n${exclusions}\n  </cloud-backup>\n  <device-transfer>\n    <include domain="file" path="SQLite/" />\n${exclusions}\n  </device-transfer>\n</data-extraction-rules>\n`
}

function applyManifest(androidManifest) {
  const application = AndroidConfig.Manifest.getMainApplication(androidManifest)
  application.$['android:allowBackup'] = 'true'
  application.$['android:fullBackupContent'] = `@xml/${FULL_BACKUP_CONTENT}`
  application.$['android:dataExtractionRules'] = `@xml/${DATA_EXTRACTION_RULES}`
  return androidManifest
}

function withNabdBackup(config) {
  config = withAndroidManifest(config, (mod) => {
    mod.modResults = applyManifest(mod.modResults)
    return mod
  })

  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const xmlDirectory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml')
      await fs.mkdir(xmlDirectory, { recursive: true })
      await Promise.all([
        fs.writeFile(
          path.join(xmlDirectory, `${FULL_BACKUP_CONTENT}.xml`),
          makeFullBackupContent(),
        ),
        fs.writeFile(
          path.join(xmlDirectory, `${DATA_EXTRACTION_RULES}.xml`),
          makeDataExtractionRules(),
        ),
      ])
      return mod
    },
  ])
}

module.exports = withNabdBackup
module.exports._internals = {
  applyManifest,
  makeDataExtractionRules,
  makeFullBackupContent,
}
