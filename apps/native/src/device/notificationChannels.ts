import * as Notifications from 'expo-notifications'
import type { NotificationChannelInput } from 'expo-notifications'

import { logger } from '../observability/logger'

export type NotificationMomentKind = 'before' | 'adhan' | 'adhanFajr' | 'iqamah'
export type ChannelVariant = 'normal' | 'alarm'

type ChannelDefinition = {
  id: string
  alarmId: string
  name: string
  alarmName: string
  sound: string
}

export const NOTIFICATION_CHANNELS: Record<NotificationMomentKind, ChannelDefinition> = {
  before: {
    id: 'nabd-prayer-before-v1',
    alarmId: 'nabd-prayer-before-alarm-v1',
    name: 'اقتربت الصلاة',
    alarmName: 'اقتربت الصلاة (منبّه)',
    sound: 'before.mp3',
  },
  adhan: {
    id: 'nabd-prayer-adhan-v1',
    alarmId: 'nabd-prayer-adhan-alarm-v1',
    name: 'الأذان',
    alarmName: 'الأذان (منبّه)',
    sound: 'adhan.mp3',
  },
  adhanFajr: {
    id: 'nabd-prayer-fajr-v1',
    alarmId: 'nabd-prayer-fajr-alarm-v1',
    name: 'أذان الفجر',
    alarmName: 'أذان الفجر (منبّه)',
    sound: 'adhan_fajr.mp3',
  },
  iqamah: {
    id: 'nabd-prayer-iqamah-v1',
    alarmId: 'nabd-prayer-iqamah-alarm-v1',
    name: 'الإقامة',
    alarmName: 'الإقامة (منبّه)',
    sound: 'iqama.mp3',
  },
}

export const DEFAULT_CHANNEL_ID = NOTIFICATION_CHANNELS.adhan.id

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
