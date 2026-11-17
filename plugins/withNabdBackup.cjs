const fs = require('node:fs/promises')
const path = require('node:path')
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins')

const FULL_BACKUP_CONTENT = 'nabd_backup_rules'
const DATA_EXTRACTION_RULES = 'nabd_data_extraction_rules'
// Once an include exists Android backs up nothing else, so no excludes are needed; release lint
// (FullBackupContent) also rejects excludes outside an included path.
const SQLITE_INCLUDE = '<include domain="file" path="SQLite/" />'

function makeFullBackupContent() {
  return `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n  ${SQLITE_INCLUDE}\n</full-backup-content>\n`
}

function makeDataExtractionRules() {
  return `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n    ${SQLITE_INCLUDE}\n  </cloud-backup>\n  <device-transfer>\n    ${SQLITE_INCLUDE}\n  </device-transfer>\n</data-extraction-rules>\n`
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
