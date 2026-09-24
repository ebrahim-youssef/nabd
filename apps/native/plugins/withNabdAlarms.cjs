const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins')

const PERMISSIONS = [
  'android.permission.USE_EXACT_ALARM',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
]

function applyManifest(androidManifest) {
  for (const permission of PERMISSIONS) {
    AndroidConfig.Permissions.ensurePermission(androidManifest, permission)
  }

  const permissions = androidManifest.manifest['uses-permission'] ?? []
  const scheduleExactAlarm = permissions.find(
    (permission) => permission.$?.['android:name'] === 'android.permission.SCHEDULE_EXACT_ALARM',
  )

  if (!scheduleExactAlarm) {
    throw new Error('SCHEDULE_EXACT_ALARM permission was not added to the Android manifest')
  }

  scheduleExactAlarm.$['android:maxSdkVersion'] = '32'
  return androidManifest
}

function withNabdAlarms(config) {
  return withAndroidManifest(config, (mod) => {
    mod.modResults = applyManifest(mod.modResults)
    return mod
  })
}

module.exports = withNabdAlarms
module.exports._internals = { PERMISSIONS, applyManifest }
