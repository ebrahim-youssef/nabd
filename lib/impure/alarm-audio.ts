import { registerPlugin } from '@capacitor/core'

// Bridge to the app-local Android AlarmAudioPlugin (NBD-64). ensureAlarmChannels creates a
// parallel set of notification channels whose sound plays through the phone's ALARM stream
// (USAGE_ALARM), so the adhan is audible on silent/vibrate. Only used when the user turns the
// silent-mode switch on; web / non-native rejects and callers ignore it.
export interface AlarmChannelSpec {
  id: string
  name: string
  // res/raw resource name WITHOUT extension (e.g. "adhan"), used to build the channel sound Uri.
  sound: string
}

export interface AlarmAudioPlugin {
  ensureAlarmChannels(options: { channels: AlarmChannelSpec[] }): Promise<void>
}

export const AlarmAudio = registerPlugin<AlarmAudioPlugin>('AlarmAudio')
