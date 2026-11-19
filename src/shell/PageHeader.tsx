import { ArrowRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { shellCopy } from './copy'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { Text } from './Text'

export function PageHeader({ title, backHref }: { title: string; backHref?: string }) {
  const router = useRouter()
  const theme = useThemeColors()

  return (
    <View className="flex-row items-center gap-3">
      {backHref ? (
        <Pressable
          accessibilityLabel={shellCopy.back}
          accessibilityRole="button"
          className="size-9 items-center justify-center rounded-control border border-line bg-surface"
          onPress={() => (router.canGoBack() ? router.back() : router.replace(backHref))}
          testID="page-back"
        >
          <ArrowRight accessible={false} color={theme.ink} size={ICON_SIZE} />
        </Pressable>
      ) : null}
      <Text
        accessibilityRole="header"
        className="font-display text-screen-title text-start text-ink"
      >
        {title}
      </Text>
    </View>
  )
}
