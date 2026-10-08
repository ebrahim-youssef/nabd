import { ALARM_CHANNELS } from '@nabd/shared'
import type { AlarmPayload } from '@nabd/shared'
import * as Notifications from 'expo-notifications'
import type { NotificationChannelInput } from 'expo-notifications'

import { logger } from '../observability/logger'

type NotificationMomentKind = AlarmPayload['channelKey']

type ChannelDefinition = {
  id: string
  alarmId: string
  name: string
  alarmName: string
  sound: string
}

const VERSIONED_CHANNEL_IDS: Record<NotificationMomentKind, string> = {
  before: 'nabd-prayer-before-v1',
  adhan: 'nabd-prayer-adhan-v1',
  adhanFajr: 'nabd-prayer-fajr-v1',
  iqamah: 'nabd-prayer-iqamah-v1',
  adhkarReminder: 'nabd-adhkar-reminder-v1',
}
const ALARM_CHANNEL_SUFFIX = '-alarm-v1'
const ALARM_CHANNEL_SUFFIX_LABEL = ' (منبّه)'

function channelDefinition(momentKind: NotificationMomentKind): ChannelDefinition {
  const shared = ALARM_CHANNELS[momentKind]
  const id = VERSIONED_CHANNEL_IDS[momentKind]
  return {
    id,
    alarmId: id.replace(/-v1$/, ALARM_CHANNEL_SUFFIX),
    name: shared.name,
    alarmName: `${shared.name}${ALARM_CHANNEL_SUFFIX_LABEL}`,
    sound: shared.sound,
  }
}

const NOTIFICATION_CHANNELS: Record<AlarmPayload['channelKey'], ChannelDefinition> = {
  before: channelDefinition('before'),
  adhan: channelDefinition('adhan'),
  adhanFajr: channelDefinition('adhanFajr'),
  iqamah: channelDefinition('iqamah'),
  adhkarReminder: channelDefinition('adhkarReminder'),
}

export function channelFor(momentKind: NotificationMomentKind, silentMode: boolean): string {
  const channel = NOTIFICATION_CHANNELS[momentKind]
  return silentMode ? channel.alarmId : channel.id
}

function channelConfig(channel: ChannelDefinition, alarm: boolean): NotificationChannelInput {
  return {
    name: alarm ? channel.alarmName : channel.name,
    importance: Notifications.AndroidImportance.HIGH,
    sound: channel.sound,
    audioAttributes: {
      usage: alarm
        ? Notifications.AndroidAudioUsage.ALARM
        : Notifications.AndroidAudioUsage.NOTIFICATION,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
  }
}

export async function ensureChannels(): Promise<void> {
  try {
    for (const channel of Object.values(NOTIFICATION_CHANNELS)) {
      await Notifications.setNotificationChannelAsync(channel.id, channelConfig(channel, false))
      await Notifications.setNotificationChannelAsync(channel.alarmId, channelConfig(channel, true))
    }
  } catch (cause) {
    logger.error('Native notification channel setup failed', cause, {
      operation: 'ensure-channels',
    })
    throw cause
  }
}
