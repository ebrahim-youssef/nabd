const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins')

const PERMISSIONS = [
  'android.permission.USE_EXACT_ALARM',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
]

const PRAYER_ALARM_RECEIVER = 'expo.modules.nabddevice.PrayerAlarmReceiver'
const PRAYER_ACTION_RECEIVER = 'expo.modules.nabddevice.PrayerActionReceiver'
const SYSTEM_TIME_RECEIVER = 'expo.modules.nabddevice.SystemTimeReceiver'
const WIDGET_BOUNDARY_RECEIVER = 'expo.modules.nabddevice.WidgetBoundaryReceiver'
const WIDGET_PROVIDER_UPDATE = 'android.appwidget.action.APPWIDGET_UPDATE'
const WIDGET_PROVIDERS = [
  {
    name: 'expo.modules.nabddevice.NabdLargeWidgetProvider',
    label: '@string/nabd_widget_large_label',
    resource: '@xml/nabd_widget_large_info',
  },
  {
    name: 'expo.modules.nabddevice.NabdSmallWidgetProvider',
    label: '@string/nabd_widget_small_label',
    resource: '@xml/nabd_widget_small_info',
  },
]
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

  const prayerActionReceiver = receivers.find(
    (receiver) => receiver.$?.['android:name'] === PRAYER_ACTION_RECEIVER,
  )
  if (prayerActionReceiver) {
    prayerActionReceiver.$['android:exported'] = 'false'
  } else {
    receivers.push({
      $: {
        'android:name': PRAYER_ACTION_RECEIVER,
        'android:exported': 'false',
      },
    })
  }

  const systemReceiver = receivers.find(
    (receiver) => receiver.$?.['android:name'] === SYSTEM_TIME_RECEIVER,
  )
  const target = systemReceiver ?? { $: { 'android:name': SYSTEM_TIME_RECEIVER } }
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

  const boundaryReceiver = receivers.find(
    (receiver) => receiver.$?.['android:name'] === WIDGET_BOUNDARY_RECEIVER,
  )
  const boundaryTarget = boundaryReceiver ?? { $: { 'android:name': WIDGET_BOUNDARY_RECEIVER } }
  boundaryTarget.$['android:exported'] = 'false'
  if (!boundaryReceiver) receivers.push(boundaryTarget)

  for (const widget of WIDGET_PROVIDERS) {
    const existing = receivers.find((receiver) => receiver.$?.['android:name'] === widget.name)
    const receiver = existing ?? { $: { 'android:name': widget.name } }
    receiver.$['android:exported'] = 'true'
    receiver.$['android:label'] = widget.label
    receiver['intent-filter'] = receiver['intent-filter'] ?? []
    const widgetFilter = receiver['intent-filter'].find((entry) =>
      entry.action?.some((action) => action.$?.['android:name'] === WIDGET_PROVIDER_UPDATE),
    ) ?? { action: [] }
    widgetFilter.action = widgetFilter.action ?? []
    if (
      !widgetFilter.action.some((action) => action.$?.['android:name'] === WIDGET_PROVIDER_UPDATE)
    ) {
      widgetFilter.action.push({ $: { 'android:name': WIDGET_PROVIDER_UPDATE } })
    }
    if (!receiver['intent-filter'].includes(widgetFilter)) {
      receiver['intent-filter'].push(widgetFilter)
    }
    receiver['meta-data'] = receiver['meta-data'] ?? []
    const metadata = receiver['meta-data'].find(
      (entry) => entry.$?.['android:name'] === 'android.appwidget.provider',
    ) ?? { $: { 'android:name': 'android.appwidget.provider' } }
    metadata.$['android:resource'] = widget.resource
    if (!receiver['meta-data'].includes(metadata)) receiver['meta-data'].push(metadata)
    if (!existing) receivers.push(receiver)
  }
  const widgetProviderNames = new Set(WIDGET_PROVIDERS.map(({ name }) => name))
  application.provider = (application.provider ?? []).filter(
    (provider) => !widgetProviderNames.has(provider.$?.['android:name']),
  )
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
