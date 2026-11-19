import { ChevronLeft, HeartHandshake, Sparkles } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { COPY as ADHKAR_COPY } from '../adhkar/copy'
import { ADHKAR_LIBRARY } from '../content/adhkar'
import { INTENTIONS_LIBRARY } from '../content/intentions'
import { INTENTIONS_COPY } from '../intentions/copy'
import { toArabicIndic } from '../lib/format'

import { PageHeader } from './PageHeader'
import { ScreenContainer } from './ScreenContainer'
import { Text } from './Text'
import { ICON_SIZE, useThemeColors } from '../../theme/tokens'

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
  const theme = useThemeColors()

  return (
    <ScreenContainer testID="libraries-screen">
      <View className="gap-6">
        <PageHeader backHref="/" title="المكتبات" />
        <View className="gap-4" testID="libraries-hub">
          {libraries.map(({ href, title, description, count, Icon }) => (
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card"
              key={href}
              onPress={() => router.push(href)}
            >
              <View className="size-14 shrink-0 items-center justify-center rounded-pill bg-accent/10">
                <Icon accessible={false} color={theme.accent} size={LIBRARY_ICON_SIZE} />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-display text-sheet-title text-accent">{title}</Text>
                <Text className="text-meta text-ink">{description}</Text>
                <Text className="font-sans-bold text-chip text-gold">{count}</Text>
              </View>
              <ChevronLeft accessible={false} color={theme['mute']} size={ICON_SIZE} />
            </Pressable>
          ))}
        </View>
        <Text accessible={false} className="text-center text-sheet-title text-mute">
          {LIBRARY_ORNAMENT}
        </Text>
      </View>
    </ScreenContainer>
  )
}
