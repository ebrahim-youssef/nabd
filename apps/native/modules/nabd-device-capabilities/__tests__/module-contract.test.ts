import fs from 'node:fs'
import path from 'node:path'

const moduleRoot = path.resolve(__dirname, '..')
const appRoot = path.resolve(moduleRoot, '../..')

describe('nabd-device-capabilities local module contract', () => {
  it('is registered as an Expo config plugin by the native app', () => {
    const appConfig = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8')) as {
      expo: { plugins: string[] }
    }

    expect(appConfig.expo.plugins).toContain('./plugins/withNabdDeviceCapabilities')
  })

  it('registers the Android Expo module and only the Android platform', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(moduleRoot, 'package.json'), 'utf8'),
    ) as { name: string; main: string }
    const config = JSON.parse(
      fs.readFileSync(path.join(moduleRoot, 'expo-module.config.json'), 'utf8'),
    ) as { platforms: string[]; android: { modules: string[] } }

    expect(packageJson.name).toBe('nabd-device-capabilities')
    expect(packageJson.main).toBe('index.ts')
    expect(config.platforms).toEqual(['android'])
    expect(config.android.modules).toEqual(['com.nabd.capabilities.NabdDeviceCapabilitiesModule'])
  })

  it('exports a typed JavaScript boundary for every native capability action', () => {
    const entry = fs.readFileSync(path.join(moduleRoot, 'index.ts'), 'utf8')

    for (const name of [
      'getCapabilitySnapshot',
      'requestNotificationPermission',
      'openApplicationSettings',
      'openExactAlarmSettings',
      'requestLocation',
      'ensureLocationServices',
      'replacePrayerSchedule',
      'cancelPrayerSchedule',
      'setCountdown',
      'clearCountdown',
      'requestBatteryOptimizationExemption',
      'openBatteryOptimizationSettings',
      'restoreAfterBoot',
    ]) {
      expect(entry).toContain(name)
    }
  })

  it('declares WorkManager and boot-rearm implementation in the Android source', () => {
    const source = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/NabdDeviceCapabilitiesModule.kt'),
      'utf8',
    )
    const alarm = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/AlarmSupport.kt'),
      'utf8',
    )
    const countdown = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/CountdownSupport.kt'),
      'utf8',
    )

    expect(alarm).toContain('AlarmBootReceiver')
    expect(source).toContain('restoreAfterBoot')
    expect(countdown).toContain('WorkManager')
    expect(countdown).toContain('enqueueUniquePeriodicWork')
    expect(countdown).toContain('cancelUniqueWork')
  })

  it('validates bounded schedule payloads before native persistence and boot rearm', () => {
    const validation = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/ScheduleValidation.kt'),
      'utf8',
    )

    expect(validation).toContain('MAX_SCHEDULE_ITEMS')
    expect(validation).toContain('MAX_ALARM_ID')
    expect(validation).toContain('ALLOWED_CHANNEL_KEYS')
    expect(validation).toContain('THREE_DAYS_MS')
    expect(validation).toContain('if (payloads.length() == 0) return false')
    expect(validation).toContain('validate')
    expect(validation).toContain('runCatching')
  })

  it('does not duplicate the durable coordinate cache in native preferences', () => {
    const module = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/NabdDeviceCapabilitiesModule.kt'),
      'utf8',
    )
    const constants = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/CapabilityConstants.kt'),
      'utf8',
    )

    expect(module).not.toContain('LOCATION_PREFS')
    expect(module).not.toContain('LOCATION_RECORDED_AT')
    expect(constants).not.toContain('LOCATION_PREFS')
    expect(module).toContain('setMaxUpdateAgeMillis(600_000L)')
  })

  it('cancels old persisted alarms before boot rearm', () => {
    const alarm = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/AlarmSupport.kt'),
      'utf8',
    )

    expect(alarm).toContain('cancelStoredAlarms')
    expect(alarm).toContain('cancelStoredAlarms(context, saved, alarmOnSilent)')
    expect(alarm).toContain('ScheduleValidation.parse')
  })

  it('returns explicit disabled results without persisting or arming', () => {
    const alarm = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/AlarmSupport.kt'),
      'utf8',
    )
    const countdown = fs.readFileSync(
      path.join(moduleRoot, 'android/src/main/java/com/nabd/capabilities/CountdownSupport.kt'),
      'utf8',
    )

    expect(alarm).toContain('"reason" to "notificationsDisabled"')
    expect(alarm.indexOf('areNotificationsEnabled()')).toBeLessThan(
      alarm.indexOf('putString(CapabilityConstants.ALARM_PAYLOADS'),
    )
    expect(countdown).toContain('"reason" to "notificationsDisabled"')
    expect(countdown.indexOf('areNotificationsEnabled()')).toBeLessThan(
      countdown.indexOf('putString(CapabilityConstants.COUNTDOWN_BOUNDARIES'),
    )
  })
})
