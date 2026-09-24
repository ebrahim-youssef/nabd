import { ChevronLeft, HeartHandshake, Sparkles } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import {
  ADHKAR_COPY,
  ADHKAR_LIBRARY,
  INTENTIONS_COPY,
  INTENTIONS_LIBRARY,
  shellCopy,
  toArabicIndic,
} from '@nabd/shared'

import { PageHeader } from './PageHeader'
import { ScreenContainer } from './ScreenContainer'
import { ICON_SIZE, useThemeTokens } from '../../theme/palette'

const LIBRARY_ICON_SIZE = 28
const LIBRARY_ORNAMENT = '۞'

const libraries = [
  {
    href: '/adhkar',
    title: ADHKAR_COPY.libraryTitle,
    description: ADHKAR_COPY.hubDescription,
    count: `${toArabicIndic(ADHKAR_LIBRARY.length)} ${ADHKAR_COPY.sections} · ${toArabicIndic(ADHKAR_LIBRARY.reduce((sum, category) => sum + category.items.length, 0))} ${ADHKAR_COPY.adhkar}`,
    Icon: Sparkles,
  },
  {
    href: '/niyyat',
    title: INTENTIONS_COPY.libraryTitle,
    description: INTENTIONS_COPY.hubDescription,
    count: `${toArabicIndic(INTENTIONS_LIBRARY.length)} ${INTENTIONS_COPY.deeds} · ${toArabicIndic(INTENTIONS_LIBRARY.reduce((sum, deed) => sum + deed.intentions.length, 0))} ${INTENTIONS_COPY.intentions}`,
    Icon: HeartHandshake,
  },
] as const

export function LibrariesRoute() {
  const router = useRouter()
  const theme = useThemeTokens()

  return (
    <ScreenContainer testID="libraries-screen">
      <View className="gap-6">
        <PageHeader backHref="/" title={shellCopy.nav.libraries} />
        <View className="gap-4" testID="libraries-hub">
          {libraries.map(({ href, title, description, count, Icon }) => (
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card-sm"
              key={href}
              onPress={() => router.push(href)}
            >
              <View className="size-14 shrink-0 items-center justify-center rounded-icon bg-primary/10">
                <Icon accessible={false} color={theme.hex.primary} size={LIBRARY_ICON_SIZE} />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-title text-primary">{title}</Text>
                <Text className="text-small text-muted-foreground">{description}</Text>
                <Text className="text-label text-gold">{count}</Text>
              </View>
              <ChevronLeft
                accessible={false}
                color={theme.hex['muted-foreground']}
                size={ICON_SIZE}
              />
            </Pressable>
          ))}
        </View>
        <Text accessible={false} className="text-center text-title text-faint">
          {LIBRARY_ORNAMENT}
        </Text>
      </View>
    </ScreenContainer>
  )
}
