import type { LucideIcon } from 'lucide-react-native'
import { usePathname, useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useWirdToday } from '../day-plan/WirdTodayProvider'
import { ICON_SIZE, TABBAR_HEIGHT, useThemeColors } from '../../theme/tokens'
import { shellCopy } from './copy'
import { Text } from './Text'
import { isNavMatch } from './navMatch'

type NativeIcons = {
  BookOpen: LucideIcon
  CalendarDays: LucideIcon
  Ellipsis: LucideIcon
  Home: LucideIcon
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  match: readonly string[]
  exact?: boolean
  testId: string
}

const MIN_BOTTOM_PADDING = 12
const ICON_STROKE_WIDTH = 1.7
// Tabs are 72px wide; the slop keeps the whole column a comfortable touch target.
const TAB_HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 }
export const BOTTOM_NAV_CLEARANCE = TABBAR_HEIGHT

export function BottomNav({ isVisible = true }: { isVisible?: boolean }) {
  const { BookOpen, CalendarDays, Ellipsis, Home } = require('lucide-react-native') as NativeIcons
  const pathname = usePathname()
  const router = useRouter()
  const today = useWirdToday()
  const theme = useThemeColors()
  const { bottom } = useSafeAreaInsets()

  if (!isVisible) return null

  // Keep this order aligned with NAV_ORDER.
  const navItems: readonly NavItem[] = [
    {
      href: '/',
      label: shellCopy.nav.home,
      icon: Home,
      match: ['/'],
      exact: true,
      testId: 'nav-home',
    },
    {
      href: `/today/${today}`,
      label: shellCopy.nav.today,
      icon: CalendarDays,
      match: ['/today'],
      testId: 'nav-today',
    },
    {
      href: '/adhkar',
      label: shellCopy.nav.adhkar,
      icon: BookOpen,
      match: ['/adhkar'],
      testId: 'nav-adhkar',
    },
    {
      href: '/more',
      label: shellCopy.nav.more,
      icon: Ellipsis,
      match: [
        '/more',
        '/prayer-times',
        '/stats',
        '/qada',
        '/niyyat',
        '/libraries',
        '/settings',
        '/backup',
        '/level',
      ],
      testId: 'nav-more',
    },
  ]

  return (
    <View
      accessibilityLabel={shellCopy.navAriaLabel}
      className="absolute inset-x-0 bottom-0 z-40 flex-row justify-around rounded-t-tabs bg-hero px-3 pt-2.5 dark:border-t dark:border-line"
      style={{ minHeight: TABBAR_HEIGHT, paddingBottom: Math.max(bottom, MIN_BOTTOM_PADDING) }}
      testID="bottom-nav"
    >
      {navItems.map(({ href, label, icon: Icon, match, exact, testId }) => {
        const active = isNavMatch(pathname, match, exact)
        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className="w-[72px] items-center gap-1"
            hitSlop={TAB_HIT_SLOP}
            key={href}
            onPress={() => router.navigate(href)}
            testID={testId}
          >
            <Icon
              accessible={false}
              color={active ? theme.gold : theme['hero-mute']}
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            <Text
              className={`font-sans-medium text-caption ${active ? 'text-gold' : 'text-hero-mute'}`}
            >
              {label}
            </Text>
            <View className={`size-1 rounded-pill ${active ? 'bg-gold' : 'bg-transparent'}`} />
          </Pressable>
        )
      })}
    </View>
  )
}
