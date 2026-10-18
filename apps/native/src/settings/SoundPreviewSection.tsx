import { Play, Square } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeTokens } from '../../theme/palette'
import { Text } from '../shell/Text'
import { NATIVE_SETTINGS_COPY } from './constants'
import { SOUND_PREVIEWS } from './soundPreviews'
import { useSoundPreview } from './useSoundPreview'

export function SoundPreviewSection() {
  const { currentId, play, stop } = useSoundPreview()
  const theme = useThemeTokens()

  return (
    <View className="gap-3" testID="settings-sounds">
      <Text className="font-display text-label text-start text-muted-foreground">
        {NATIVE_SETTINGS_COPY.sounds.title}
      </Text>
      <View className="gap-2 rounded-card border border-border bg-surface p-4 shadow-card-sm">
        {SOUND_PREVIEWS.map((preview) => {
          const isPlaying = currentId === preview.id
          return (
            <View
              className="flex-row items-center justify-between gap-3 rounded-card border border-border bg-surface-2 p-3"
              key={preview.id}
            >
              <View className="flex-1 gap-1">
                <Text className="text-body font-body-medium text-start text-foreground">
                  {preview.label}
                </Text>
                <Text className="text-small text-start text-muted-foreground">
                  {preview.description}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`${isPlaying ? NATIVE_SETTINGS_COPY.sounds.stop : NATIVE_SETTINGS_COPY.sounds.play} ${preview.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isPlaying }}
                className={`size-12 shrink-0 items-center justify-center rounded-full border border-primary/40 ${isPlaying ? 'bg-primary' : 'bg-primary/10'}`}
                onPress={() => (isPlaying ? stop() : play(preview.id))}
                testID={`sound-preview-${preview.id}`}
              >
                {isPlaying ? (
                  <Square
                    accessible={false}
                    color={theme.hex['primary-foreground']}
                    size={ICON_SIZE}
                  />
                ) : (
                  <Play accessible={false} color={theme.hex.primary} size={ICON_SIZE} />
                )}
              </Pressable>
            </View>
          )
        })}
      </View>
      <Text className="text-label text-start text-muted-foreground">
        {NATIVE_SETTINGS_COPY.sounds.note}
      </Text>
    </View>
  )
}
