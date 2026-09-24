import { ArrowRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { shellCopy } from '@nabd/shared'

import { ICON_SIZE, useThemeTokens } from '../../theme/palette'
import { Text } from './Text'

export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  const router = useRouter()
  const theme = useThemeTokens()

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        accessibilityLabel={shellCopy.back}
        accessibilityRole="button"
        className="size-9 items-center justify-center rounded-full border border-border bg-surface shadow-card-sm"
        onPress={() => (router.canGoBack() ? router.back() : router.replace(backHref))}
        testID="page-back"
      >
        <ArrowRight accessible={false} color={theme.hex.primary} size={ICON_SIZE} />
      </Pressable>
      <Text accessibilityRole="header" className="font-display text-title text-start text-primary">
        {title}
      </Text>
    </View>
  )
}
