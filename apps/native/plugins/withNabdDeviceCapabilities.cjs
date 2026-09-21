const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

const PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
]

const CHANNEL_IDS = [
  'nabd-prayer-before-v1',
  'nabd-prayer-adhan-v1',
  'nabd-prayer-fajr-v1',
  'nabd-prayer-iqamah-v1',
  'nabd-adhkar-reminder-v1',
  'nabd-countdown-v1',
]

const AUDIO_FILES = ['adhan_fajr.mp3', 'adhan.mp3', 'before.mp3', 'iqama.mp3']

function addReceiver(application, name, exported, actions = []) {
  application.receiver = application.receiver || []
  if (application.receiver.some((receiver) => receiver.$?.['android:name'] === name)) return

  const receiver = {
    $: {
      'android:name': name,
      'android:exported': String(exported),
    },
  }
  if (actions.length > 0) {
    receiver['intent-filter'] = [
      { action: actions.map((action) => ({ $: { 'android:name': action } })) },
    ]
  }
  application.receiver.push(receiver)
}

function capAtApiLevel(androidManifest, permission, maxSdkVersion) {
  const entries = androidManifest.manifest['uses-permission'] || []
  const entry = entries.find((candidate) => candidate.$?.['android:name'] === permission)
  if (entry) entry.$['android:maxSdkVersion'] = String(maxSdkVersion)
}

function applyManifest(androidManifest) {
  for (const permission of PERMISSIONS) {
    // ensurePermission is idempotent. Calling an add/append helper here would duplicate
    // declarations every time prebuild is run against an existing native project.
    AndroidConfig.Permissions.ensurePermission(androidManifest, permission)
  }
  // SCHEDULE_EXACT_ALARM is the pre-Android-13 fallback. API 33+ uses USE_EXACT_ALARM.
  capAtApiLevel(androidManifest, 'android.permission.SCHEDULE_EXACT_ALARM', 32)

  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest)
  addReceiver(application, 'com.nabd.capabilities.PrayerAlarmReceiver', false)
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
      for (const file of AUDIO_FILES) {
        const source = path.join(sourceDir, file)
        if (!fs.existsSync(source)) {
          throw new Error(`Nabd audio asset is missing: ${source}`)
        }
        fs.copyFileSync(source, path.join(rawDir, file))
      }
      return mod
    },
  ])
}

module.exports = function withNabdDeviceCapabilities(config) {
  return withAdhanAudio(withManifest(config))
}

module.exports._internals = {
  AUDIO_FILES,
  CHANNEL_IDS,
  PERMISSIONS,
  addReceiver,
  applyManifest,
}
