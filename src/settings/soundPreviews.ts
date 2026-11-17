import { NATIVE_SETTINGS_COPY } from './constants'

export type SoundPreviewId = 'before' | 'adhan' | 'adhan-fajr' | 'iqama'

export type SoundPreview = {
  id: SoundPreviewId
  label: string
  description: string
  asset: number
}

export const SOUND_PREVIEWS: readonly SoundPreview[] = [
  {
    id: 'before',
    ...NATIVE_SETTINGS_COPY.sounds.previews.before,
    asset: require('../../assets/sounds/before.mp3'),
  },
  {
    id: 'adhan',
    ...NATIVE_SETTINGS_COPY.sounds.previews.adhan,
    asset: require('../../assets/sounds/adhan.mp3'),
  },
  {
    id: 'adhan-fajr',
    ...NATIVE_SETTINGS_COPY.sounds.previews['adhan-fajr'],
    asset: require('../../assets/sounds/adhan_fajr.mp3'),
  },
  {
    id: 'iqama',
    ...NATIVE_SETTINGS_COPY.sounds.previews.iqama,
    asset: require('../../assets/sounds/iqama.mp3'),
  },
]
