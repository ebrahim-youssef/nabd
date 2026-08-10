const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

const PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  // Nabd is alarm-core (adhan): USE_EXACT_ALARM is the Play-policy path that remains
  // auto-granted on Android 14; SCHEDULE_EXACT_ALARM remains the older-Android fallback.
  'android.permission.USE_EXACT_ALARM',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  // Declared for the later, user-initiated onboarding exemption flow. This PR does not prompt.
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
]

const AUDIO_FILES = ['adhan_fajr.mp3', 'adhan.mp3', 'before.mp3', 'iqama.mp3']

function addReceiver(application, name, exported, actions = []) {
  application.receiver = application.receiver || []
  if (application.receiver.some((receiver) => receiver.$?.['android:name'] === name)) return
  const receiver = { $: { 'android:name': name, 'android:exported': String(exported) } }
  if (actions.length > 0) {
    receiver['intent-filter'] = [
      { action: actions.map((action) => ({ $: { 'android:name': action } })) },
    ]
  }
  application.receiver.push(receiver)
}

// Kept separate from the mod wrapper so it can be tested directly. The first version of this
// plugin called a config-plugins function that does not exist, prebuild failed, and the tests
// still passed because they only exercised the constants and the receiver helper.
function applyManifest(androidManifest) {
  for (const permission of PERMISSIONS) {
    // ensurePermission is idempotent; addPermission appends unconditionally and would
    // duplicate entries on repeated prebuilds.
    AndroidConfig.Permissions.ensurePermission(androidManifest, permission)
  }
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest)
  addReceiver(application, 'com.nabd.capabilities.PrayerAlarmReceiver', false)
  // BOOT_COMPLETED is a protected broadcast, so the system still delivers it to a receiver that
  // is not exported. Keeping it false stops other apps invoking the re-arm path directly.
  addReceiver(application, 'com.nabd.capabilities.AlarmBootReceiver', false, [
    'android.intent.action.BOOT_COMPLETED',
  ])
  return androidManifest
}

function withManifest(config) {
  return withAndroidManifest(config, (mod) => {
    applyManifest(mod.modResults)
    return mod
  })
}

function withAdhanAudio(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const rawDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'raw',
      )
      const sourceDir = path.resolve(
        mod.modRequest.projectRoot,
        '..',
        '..',
        'android',
        'app',
        'src',
        'main',
        'res',
        'raw',
      )
      fs.mkdirSync(rawDir, { recursive: true })
      for (const file of AUDIO_FILES)
        fs.copyFileSync(path.join(sourceDir, file), path.join(rawDir, file))
      return mod
    },
  ])
}

module.exports = function withNabdDeviceCapabilities(config) {
  return withAdhanAudio(withManifest(config))
}

module.exports._internals = { PERMISSIONS, AUDIO_FILES, addReceiver, applyManifest }
