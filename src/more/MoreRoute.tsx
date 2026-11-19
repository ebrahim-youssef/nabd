import { ChevronLeft } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { MORE_COPY } from './copy'
import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'

export function MoreRoute() {
  const router = useRouter()
  const theme = useThemeColors()

  return (
    <ScreenContainer testID="more-screen">
      <View className="gap-6">
        <PageHeader backHref="/" title={MORE_COPY.title} />
        <View className="gap-2" testID="more-list">
          {MORE_COPY.rows.map(({ label, href }) => (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              className="flex-row items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
              key={href}
              onPress={() => router.push(href)}
              testID={`more-row-${href.slice(1)}`}
            >
              <Text className="text-body text-ink">{label}</Text>
              <ChevronLeft accessible={false} color={theme.mute} size={ICON_SIZE} />
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenContainer>
  )
}
