import { ArrowRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { shellCopy } from '@nabd/shared'

import { ICON_SIZE, NATIVE_THEME } from './nativeTheme'

export function PageHeader({ title }: { title: string }) {
  const router = useRouter()

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        accessibilityLabel={shellCopy.back}
        accessibilityRole="button"
        className="size-9 items-center justify-center rounded-full border border-border bg-surface shadow-card-small"
        onPress={() => router.back()}
        testID="page-back"
      >
        <ArrowRight accessible={false} color={NATIVE_THEME.colors.primary} size={ICON_SIZE} />
      </Pressable>
      <Text accessibilityRole="header" className="text-title text-primary">
        {title}
      </Text>
    </View>
  )
}
