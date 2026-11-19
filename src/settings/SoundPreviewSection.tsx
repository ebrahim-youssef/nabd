import { View } from 'react-native'

import { Text } from '../shell/Text'
import { AudioRow } from '../ui/AudioRow'
import { SectionHeader } from '../ui/SectionHeader'
import { NATIVE_SETTINGS_COPY } from './constants'
import { SOUND_PREVIEWS } from './soundPreviews'
import { useSoundPreview } from './useSoundPreview'

export function SoundPreviewSection() {
  const { currentId, play, stop } = useSoundPreview()
  return (
    <View className="gap-3" testID="settings-sounds">
      <SectionHeader title={NATIVE_SETTINGS_COPY.sounds.title} />
      <View className="gap-2 rounded-card border border-line bg-surface p-4">
        {SOUND_PREVIEWS.map((preview) => (
          <AudioRow
            key={preview.id}
            label={preview.label}
            description={preview.description}
            playing={currentId === preview.id}
            onToggle={() => (currentId === preview.id ? stop() : play(preview.id))}
          />
        ))}
      </View>
      <Text className="font-sans text-meta text-mute">{NATIVE_SETTINGS_COPY.sounds.note}</Text>
    </View>
  )
}
