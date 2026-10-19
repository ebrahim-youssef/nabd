const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins')

const PERMISSIONS = [
  'android.permission.USE_EXACT_ALARM',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
]

const PRAYER_ALARM_RECEIVER = 'expo.modules.nabddevice.PrayerAlarmReceiver'
const SYSTEM_TIME_RECEIVER = 'expo.modules.nabddevice.SystemTimeReceiver'
const SYSTEM_TIME_ACTIONS = [
  'android.intent.action.BOOT_COMPLETED',
  'android.intent.action.TIME_SET',
  'android.intent.action.TIMEZONE_CHANGED',
  'android.intent.action.MY_PACKAGE_REPLACED',
  'android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED',
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

  const application = AndroidConfig.Manifest.getMainApplication(androidManifest)
  const receivers = application.receiver ?? []
  const prayerReceiver = receivers.find(
    (receiver) => receiver.$?.['android:name'] === PRAYER_ALARM_RECEIVER,
  )
  if (prayerReceiver) {
    prayerReceiver.$['android:exported'] = 'false'
  } else {
    receivers.push({
      $: {
        'android:name': PRAYER_ALARM_RECEIVER,
        'android:exported': 'false',
      },
    })
  }

  const systemReceiver = receivers.find(
    (receiver) => receiver.$?.['android:name'] === SYSTEM_TIME_RECEIVER,
  )
  const target = systemReceiver ?? {
    $: {
      'android:name': SYSTEM_TIME_RECEIVER,
      'android:exported': 'true',
    },
  }
  target.$['android:exported'] = 'true'
  target['intent-filter'] = target['intent-filter'] ?? []
  const filter = target['intent-filter'][0] ?? { action: [] }
  filter.action = filter.action ?? []
  for (const action of SYSTEM_TIME_ACTIONS) {
    if (!filter.action.some((entry) => entry.$?.['android:name'] === action)) {
      filter.action.push({ $: { 'android:name': action } })
    }
  }
  if (!target['intent-filter'].includes(filter)) target['intent-filter'].push(filter)
  if (!systemReceiver) receivers.push(target)
  application.receiver = receivers
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
